# Spotify Context History

npm package to work on top of the context history from a Spotify user. You can retrieve the context (most recent played tracks) and resume playing a context.

## Requirements

 - Valid Access Token (otherwise you'll get just a bunch of failed promises)
 - Spotify scope: `user-read-currently-playing`, `user-read-recently-played` and `user-modify-playback-state`
 - Premium user account in order to [use the play method](https://developer.spotify.com/documentation/web-api/reference/player/start-a-users-playback/)

## Installation

`npm install spotify-context-history`

## Example

```javascript
const SpotifyContextHistory = require('spotify-context-history');

const spotifyContextHistory = new SpotifyContextHistory('valid access token');

// Returns a promise that resolves to the user play context (map of `string` to `string`)
// the keys are the uri of the context (album or playlist)
// the values are the tracks of the last track played in the given context
spotifyContextHistory.update()
    .then(console.log, console.error);

// Returns the same as `update()`, but it does not refresh the data and returns the same
// context from the last update
spotifyContextHistory.getRawContextHistory()
    .then(console.log, console.error);

// Returns a promise that resolves to the information about the album/playlist
// https://developer.spotify.com/documentation/web-api/reference/albums/get-album/
// https://developer.spotify.com/documentation/web-api/reference/playlists/get-playlist/
spotifyContextHistory.getContextInfo("album/playlist's id/uri")
    .then(console.log, console.error);

// Returns a promise that resolves to the information about the track
// https://developer.spotify.com/documentation/web-api/reference/tracks/get-track/
spotifyContextHistory.getTrackInfo("track's uri/id")
    .then(console.log, console.error);

// Returns a promise that resolves into an array where each element is a JSON object with 
// the following attributes:
//  - context
//  - track
// The value of each attribute is the respective information from `getContextInfo()` or  
// `getTrackInfo()`. The context history used is the one from the last update.
spotifyContextHistory.getContextHistory()
    .then(console.log, console.error);

// Returns the same as `getContextHistory()`, but before calling it the data is updated
spotifyContextHistory.getUpdatedContextHistory()
    .then(console.log, console.error);

// Returns a promise that indicates the success/failure of the play operation
// This method resumes playing from a context
// If the track is not present in the album/playlist, then it starts from the beginning
spotifyContextHistory.play("album/playlist's id/uri")
    .then(console.log, console.error);
```
