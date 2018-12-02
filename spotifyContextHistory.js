const SpotifyWebApi = require('spotify-web-api-node');

// /////////////////////
// // Private methods //
// /////////////////////
const getContextBuckets = Symbol('getContextBuckets');
const getPlaylists = Symbol('getPlaylists');
const getContextPromises = Symbol('getContextPromises');
const handleRecentlyPlayedTracksResponse = Symbol('handleRecentlyPlayedTracksResponse');
const getSuccessfulPlaylistRequests = Symbol('getSuccessfulPlaylistRequests');
const addToContextHistory = Symbol('addToContextHistory');
const getId = Symbol('getId');

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
                .then(ret => [sU, ret]))
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

    getContextHistory() {
        return this.contextHistory;
    }

    getUpdatedContextHistory() {
        return this.update().then(() => this.getContextHistory());
    }

    // If the context has not been found, it tries to play from the beginning
    play(context) {
        const element = this.contextHistory.find(el => el.context.id === this[getId](context));

        const options = {
            context_uri: context,
        };

        if (element) {
            return this.spotifyWebApi.play({
                ...options,
                offset: { uri: element.track.uri },
            })
                .catch(() => this.spotifyWebApi.play(options));
        }

        return this.spotifyWebApi.play(options);
    }

    // /////////////////////
    // // Private methods //
    // /////////////////////

    static [getContextBuckets](items, typesOfContext) {
        const buckets = new Array(typesOfContext.length);
        for (let i = 0; i < buckets.length; i += 1) {
            buckets[i] = [];
        }

        items.forEach((item) => {
            // If the context or the type of context is not defined...
            // (The type may not be defined -> https://github.com/spotify/web-api/issues/966 )
            if (!item.context || !item.context.type) {
                return;
            }

            const ctxOfTheTrack = item.context.type;

            // It is used `indexOf` instead of a comparison (`===`) to prevent false positives.
            // For instance, Spotify versioned `playlist` to `playlist_v2`
            // https://github.com/spotify/web-api/issues/995
            const idx = typesOfContext.findIndex(ctxType => ctxOfTheTrack.indexOf(ctxType) !== -1);

            if (idx === -1) {
                console.warn(`spotify-context-history: Unrecognised context type: ${ctxOfTheTrack}`);
            } else {
                buckets[idx].push(item);
            }
        });

        return buckets;
    }

    static [getSuccessfulPlaylistRequests](responses) {
        return responses.filter((playlistResponse) => {
            const isSuccessfulRequest = playlistResponse.statusCode === 200;

            if (!isSuccessfulRequest) {
                console.warn(`spotify-context-history: Failed to get playlist (it will be ignored): ${playlistResponse}`);
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
            .then(res => SpotifyContextHistory[getSuccessfulPlaylistRequests](res))
            .then(res => res.map(r => r.body))
            .then(res => ids.map(id => res.find(playlistResponse => playlistResponse.id === id)));
    }

    static [getContextPromises](buckets, fns) {
        const promises = [];

        fns.forEach((fn, index) => {
            const bucket = buckets[index];

            const ids = bucket.map(item => this[getId](item.context.uri));

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
            return Promise.resolve();
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

        const buckets = SpotifyContextHistory[getContextBuckets](
            items,
            typesOfContext.map(el => el.key),
        );

        const promises = SpotifyContextHistory[getContextPromises](
            buckets,
            typesOfContext.map(el => el.fn),
        );

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

    static [getId](uri) {
        return uri.split(':').pop();
    }
}

module.exports = SpotifyContextHistory;
