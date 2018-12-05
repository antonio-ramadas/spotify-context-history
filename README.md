# Spotify Context History

[npm package](https://www.npmjs.com/package/spotify-context-history) to work on top of the context history from a Spotify user. You can retrieve the context (most recently played tracks) and resume playing [a context](#why-name-it-context).

## Use case

A user is listening to an album named Foo and stops listening to in the middle of it. It then starts listening to another album named Bar and it listens to just a couple of tracks.

In a normal scenario, if he/she is using the app from Spotify, then going back to play Foo does not resume playing to the last track.

This package empowers you with the ability to build this _feature_. Both albums Foo and Bar are separate contexts and **each context points to the last track played**. Hence, you can resume playing a context (an album in the given example).

### Why name it "context"?

In the previous example, it is only talked about **albums**. But this package also supports **playlists** and **artists**. A track can be from one of these three types depending on the **context** where it was played to.

## Requirements

 - Valid Access Token (otherwise you'll get just a bunch of failed promises)
 - Spotify scopes: `user-read-currently-playing`, `user-read-recently-played` and `user-modify-playback-state`

## Installation

`npm install spotify-context-history`

## Example

```javascript
const SpotifyContextHistory = require('spotify-context-history');

const spotifyContextHistory = new SpotifyContextHistory('valid access token');

// You can use this method to change the access token
spotifyContextHistory.setAccessToken('valid access token');

// Returns a promise that resolves to the user play contexts
// Argument:
//  - Optional
//  - Unix timestamp in milliseconds
//  - If passed, it will get all tracks from the Spotify API since the timestamp passed
//  - If not passed, it just gets the 50 most recent tracks or
//      the tracks played since the last timestamp.
// Return:
//  - Very similar to https://developer.spotify.com/documentation/web-api/reference/player/get-recently-played/
//  - Array of JSON objects with three fields:
//     - `played_at` -> The date and time the track was played. (e.g., "2016-12-13T20:42:17.016Z")
//     - `context`   -> One of these Spotify Objects: Artist, Album or Playlist
//     - `track`     -> Track Object from Spotify (simplified)
// - Very succinctly, the return is similar to Get Current User's Recently Played Tracks,
//     but the context has more information from:
//      - https://developer.spotify.com/documentation/web-api/reference/artists/get-several-artists/
//      - https://developer.spotify.com/documentation/web-api/reference/playlists/get-playlist/
//      - https://developer.spotify.com/documentation/web-api/reference/albums/get-several-albums/
spotifyContextHistory.update(123456789)
    .then(console.log, console.error);

// Returns the same as `update`
spotifyContextHistory.getContextHistory()
    .then(console.log, console.error);

// First updates the context and then returns the same as `getContextHistory`
spotifyContextHistory.getUpdatedContextHistory()
    .then(console.log, console.error);

// Returns a promise which indicates the success/failure of the play operation.
// This method resumes playing from a context.
// If the track is not present in the album/playlist/artist or the uri/id it is not found
// in the stored contexts, then it starts from the beginning.
spotifyContextHistory.play("album/playlist's id/uri")
    .then(console.log, console.error);
```

## Limitations
 - Premium user account in order to [use the play method](https://developer.spotify.com/documentation/web-api/reference/player/start-a-users-playback/).
 - Despite what the docs lead to assume about [_Current User's Playback Tracks_](https://developer.spotify.com/documentation/web-api/reference/player/get-recently-played/), the API does **not** return all the songs since a given period of time. [It seems that it only returns the 50 most recent songs](
https://github.com/spotify/web-api/issues/20). Nonetheless, this package ignores this restriction and still tries to get more tracks than 50. If Spotify lifts this restriction, this package should work seamlessly.
