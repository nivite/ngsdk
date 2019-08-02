// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// **** IMPORTANT ****
// *******************
// Load firebase config from https://console.firebase.google.com/project/{PROJECTID}/settings/general
// *******************
// *******************

export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyB27uElqVDLh5laZanJ0upeR1-oxqsqC3U',
    authDomain: 'nivite-af417.firebaseapp.com',
    databaseURL: 'https://nivite-af417.firebaseio.com',
    projectId: 'nivite-af417',
    storageBucket: 'nivite-af417.appspot.com',
    messagingSenderId: '419522421587',
    appId: '1:419522421587:web:e4059ec1f0536df2'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
