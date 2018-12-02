const SpotifyWebApi = require('spotify-web-api-node');

function getId(uri) {
    return uri.split(':').pop();
}

function removeDuplicateEntry(array, entry) {
    const arr = array;
    const entryId = getId(entry);

    const found = Object.keys(arr).find(el => getId(el) === entryId);

    if (found) {
        delete arr[found];
    }

    return arr;
}

// /////////////////////
// // Private methods //
// /////////////////////
const getContextBuckets = Symbol('getContextBuckets');
const getPlaylists = Symbol('getPlaylists');
const getContextPromises = Symbol('getContextPromises');
const handleRecentlyPlayedTracksResponse = Symbol('handleRecentlyPlayedTracksResponse');
const getSuccessfulPlaylistRequests = Symbol('getSuccessfulPlaylistRequests');
const addToContextHistory = Symbol('addToContextHistory');

class SpotifyContextHistory {
    constructor(accessToken) {
        this.spotifyWebApi = new SpotifyWebApi();
        this.setAccessToken(accessToken);

        // Currently, Spotify only retrieves at most 50 tracks per request
        this.limitOfTracksPerRequest = 50;

        // `contextHistory` is a map of string to string
        // the keys are the uri of the context (album or playlist)
        // the values are last track played in the given context
        this.contextHistory = [];

        // The timestamp of the last update
        this.afterTimestamp = -1;
    }

    setAccessToken(token) {
        this.spotifyWebApi.setAccessToken(token);
    }

    // afterTimestamp does not include the current time
    // https://developer.spotify.com/documentation/web-api/reference/player/get-recently-played/
    update(afterTimestamp) {
        const options = {
            limit: this.limitOfTracksPerRequest,
        };

        if (afterTimestamp) {
            options.after = afterTimestamp;
        } else if (this.afterTimestamp !== -1) {
            options.after = this.afterTimestamp;
        }

        return this.spotifyWebApi.getMyRecentlyPlayedTracks(options)
            .then((res) => {
                let shouldUpdate = false;
                if (res.statusCode === 200 && res.body && res.body.cursors) {
                    const { cursors } = res.body;

                    if (cursors.after) {
                        shouldUpdate = true;
                        this.afterTimestamp = cursors.after;
                    }
                }

                return [shouldUpdate, res];
            })
            .then(([sU, res]) => this[handleRecentlyPlayedTracksResponse](res)
                .then(ret => [sU, ret]), console.error)
            .then(([sU, context]) => {
                this[addToContextHistory](context);
                return sU;
            })
            .then((sU) => {
                if (sU) {
                    return this.update();
                }
                return Promise.resolve();
            });
    }










    getRawContextHistory() {
        return this.contextHistory;
    }

    setRawContextHistory(newContext) {
        this.contextHistory = newContext;
    }

    /*update() {
        return Promise.all([
            this.spotifyWebApi.getMyRecentlyPlayedTracks({ limit: this.limitOfTracksPerRequest }),
            this.spotifyWebApi.getMyCurrentPlayingTrack(),
        ]).then((values) => {
            // Parse recently played tracks
            const items = values[0].body.items.reverse();

            Object.values(items).forEach((item) => {
                const { context, track } = item;

                if (context && track) {
                    // The same playlist can be accessed through different URIs
                    // First, we find duplicates and then remove
                    this.contextHistory = removeDuplicateEntry(this.contextHistory, context.uri);

                    this.contextHistory[context.uri] = track.uri;
                }
            });

            // Parse current playing track
            const item = values[1].body;
            // If the user is currently listening...
            if (item.context && item.item) {
                // The same playlist can be accessed through different URIs
                // First, we find duplicates and then remove
                this.contextHistory = removeDuplicateEntry(this.contextHistory, item.context.uri);

                this.contextHistory[item.context.uri] = item.item.uri;
            }

            return this.contextHistory;
        });
    }*/

    getContextHistory() {
        const contextPromises = Object.keys(this.contextHistory)
            .map(val => this.getContextInfo(val));
        const trackPromises = Object.values(this.contextHistory)
            .map(val => this.getTrackInfo(val));

        return Promise.all(contextPromises.concat(trackPromises))
            .then((spotifyObjs) => {
                const filledContext = [];

                // The first half are the contexts
                // The second half are the tracks
                const context = spotifyObjs.splice(0, spotifyObjs.length / 2);

                context.forEach((value, index) => {
                    filledContext.push({
                        context: value,
                        track: spotifyObjs[index],
                    });
                });

                return filledContext;
            });
    }

    getUpdatedContextHistory() {
        return this.update().then(() => this.getContextHistory());
    }

    getContextInfo(uri) {
        const contextId = getId(uri);

        return this.spotifyWebApi.getPlaylist(contextId)
            .catch(() => this.spotifyWebApi.getAlbum(contextId))
            .then(res => res.body);
    }

    getTrackInfo(uri) {
        return this.spotifyWebApi.getTrack(getId(uri)).then(res => res.body);
    }

    // If the context has not been found, it tries to play from the beginning
    play(context) {
        const key = Object.keys(this.contextHistory).find(el => getId(el) === getId(context));

        return this.spotifyWebApi.play({
            context_uri: context,
            offset: { uri: this.contextHistory[key] },
        })
            .catch(() => this.spotifyWebApi.play({ context_uri: context }));
    }

    /////////////////////
    // Private methods //
    /////////////////////

    [getContextBuckets](items, typesOfContext) {
        const buckets = new Array(typesOfContext.length);
        for (let i = 0; i < buckets.length; i++) {
            buckets[i] = [];
        }

        items.forEach((item) => {
            // If the context or the type of context is not defined...
            // (The type may not be defined -> https://github.com/spotify/web-api/issues/966 )
            if (!item.context || !item.context.type) {
                return;
            }

            const contextOfTheTrack = item.context.type;

            const index = typesOfContext.findIndex((contextType) => {
                // It is used `indexOf` instead of a comparison (`===`) to prevent false positives.
                // For instance, Spotify versioned `playlist` to `playlist_v2`
                // https://github.com/spotify/web-api/issues/995
                return contextOfTheTrack.indexOf(contextType) !== -1;
            });

            if (index === -1) {
                console.warn(`spotify-context-history: Unrecognised context type: ${contextOfTheTrack}`);
            } else {
                buckets[index].push(item);
            }
        });

        return buckets;
    }

    [getSuccessfulPlaylistRequests](responses) {
        return responses.filter((playlistResponse) => {
            const isSuccessfulRequest = playlistResponse.statusCode === 200;

            if (!isSuccessfulRequest) {
                console.error(`spotify-context-history: Failed to get playlist (it will be ignored): ${playlistResponse}`);
            }

            return isSuccessfulRequest;
        });
    }

    // Currently, Spotify API does not provide an endpoint to query multiple playlists at the same
    // time, so this method makes multiple queries, but carefully avoiding repetitive ones
    // Failed queries (status code !== 200) will be `undefined`
    [getPlaylists](ids) {
        const uniqueIds = Array.from(new Set(ids));

        return Promise.all(uniqueIds.map(id => this.spotifyWebApi.getPlaylist(id)))
            .then(res => this[getSuccessfulPlaylistRequests](res))
            .then(res => res.map(r => r.body))
            .then(res => ids.map(id => res.find(playlistResponse => playlistResponse.id === id)));
    }

    [getContextPromises](buckets, fns) {
        const promises = [];

        fns.forEach((fn, index) => {
            const bucket = buckets[index];

            const ids = bucket.map(item => getId(item.context.uri));

            if (ids.length > 0) {
                promises.push(fn(ids));
            } else {
                promises.push([]);
            }
        });

        return promises;
    }

    [handleRecentlyPlayedTracksResponse](res) {
        // `!res.body.items` should not be necessary, but given that Spotify's documentation is in
        // beta it is preferable to be careful
        if (res.statusCode !== 200 || !res.body.items) {
            return;
        }

        const { items } = res.body;
        const typesOfContext = [
            {
                key: 'album',
                fn: ids => this.spotifyWebApi.getAlbums(ids).then(r => r.body.albums),
            },
            {
                key: 'artist',
                fn: ids => this.spotifyWebApi.getArtists(ids).then(r => r.body.artists),
            },
            {
                key: 'playlist',
                fn: ids => this[getPlaylists](ids),
            }];

        const buckets = this[getContextBuckets](items, typesOfContext.map(el => el.key));

        const promises = this[getContextPromises](buckets, typesOfContext.map(el => el.fn));

        return Promise.all(promises)
            .then((bucketedResponses) => {
                const context = [];

                buckets.forEach((bucket, bucketIndex) => {
                    bucket.forEach((response, responseIndex) => {
                        context.push({
                            context: bucketedResponses[bucketIndex][responseIndex],
                            track: response.track,
                            played_at: response.played_at,
                        });
                    });
                });

                return context;
            });
    }

    [addToContextHistory](context) {
        if (!context) {
            return;
        }

        context.forEach((ctxObj) => {
            const index = this.contextHistory.findIndex(h => h.context.id === ctxObj.context.id);

            if (index === -1) {
                this.contextHistory.push(ctxObj);
            } else {
                const ctxHistPlayedAt = new Date(this.contextHistory[index].played_at).getTime();
                const ctxObjPlayedAt = new Date(ctxObj.played_at).getTime();

                if (ctxHistPlayedAt < ctxObjPlayedAt) {
                    this.contextHistory[index] = ctxObj;
                }
            }
        });
    }
}

module.exports = SpotifyContextHistory;
