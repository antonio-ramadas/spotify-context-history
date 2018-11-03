const SpotifyWebApi = require('spotify-web-api-node');

function getId(uri) {
    return uri.split(':').pop();
}

class SpotifyContextHistory {
    constructor(accessToken) {
        this.spotifyWebApi = new SpotifyWebApi();
        this.spotifyWebApi.setAccessToken(accessToken);

        // Currently, Spotify only retrieves at most 50 tracks per request
        this.limitOfTracksPerRequest = 50;

        this.contextHistory = [];
    }

    setContextHistory(newContext) {
        this.contextHistory = newContext;
    }

    update() {
        return Promise.all([
            this.spotifyWebApi.getMyRecentlyPlayedTracks({ limit: this.limitOfTracksPerRequest }),
            this.spotifyWebApi.getMyCurrentPlayingTrack(),
        ]).then((values) => {
            // Parse recently played tracks
            const items = values[0].body.items.reverse();

            Object.values(items).forEach((item) => {
                this.contextHistory[item.context.uri] = item.track.uri;
            });

            // Parse current playing track
            const item = values[1].body;
            this.contextHistory[item.context.uri] = item.item.uri;

            return this.contextHistory;
        });
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

    // TODO: play from context
}

module.exports = SpotifyContextHistory;
