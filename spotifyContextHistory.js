const SpotifyWebApi = require('spotify-web-api-node');

class SpotifyContextHistory {
    constructor(accessToken) {
        this.spotifyWebApi = new SpotifyWebApi();
        this.spotifyWebApi.setAccessToken(accessToken);
    }

    // TODO: get context

    // TODO: merge contexts

    // TODO: context states

    // TODO: play from context
}

module.exports = SpotifyContextHistory;
