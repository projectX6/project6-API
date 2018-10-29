'use strict';
const APP_API_key = require('../../models').APP_API_key;


// Updating APIkeys on singup and signin
var updateAPIkeysArray = (app) => {
  let APIkeys = [];
  return APP_API_key.findAll()
  .then(APPAPIkeys => {
    for (var i = 0; i < APPAPIkeys.length; i++) {
      APIkeys.push(APPAPIkeys[i].key)
    }
    app.set('APIkeys', APIkeys);
  })
  .catch(error => {
    app.set('APIkeys', APIkeys);
    console.error(error);
  });
};

/**
  * verifyAPIkey to verify API-Key
  * Middleware to validate tokens
  * all others routues go through
  * verifyAPIkey Middleware
  */
module.exports = (req, res, next, app) => {
  // check header for API-Key
  var APIKey = req.headers['api-key'];
  if (APIKey) {
    // Fecth api keys available for app
    let APIkeys = app.get('APIkeys');

    if (APIkeys && APIkeys.length <= 0 ) {
      // To check newly Updated APIkeys
      updateAPIkeysArray(app);
    }
    // Fecthing api keys available for app
    // After Updating APIkeys in app
    APIkeys = app.get('APIkeys');

    // validations APIkeys that fectched from DB
    if (APIkeys && APIkeys.indexOf(APIKey) > -1) {
      // To maintain APIKey for next process
      req.APIKey = APIKey;
      //If APIKey is available loading next operations
      next();
    } else {
      // In else again updatings the APIkeys
      // It helps to findout directly DB updated keys.

      // To check newly Updated APIkeys
      updateAPIkeysArray(app);
      // Fecthing api keys available for app
      // After Updating APIkeys in app
      APIkeys = app.get('APIkeys');
      // validations APIkeys that fectched from DB
      if (APIkeys && APIkeys.indexOf(APIKey) > -1) {
        // To maintain APIKey for next process
        req.APIKey = APIKey;
        //If APIKey is available loading next operations
        next();
      } else {
        // No API-Key found
        // Returning 403 error
        return res.status(403).send({
            success: false,
            message: 'Invalid API Key.'
        });
      }
    }
  } else {
    // No API-Key found
    // Returning 403 error
    return res.status(403).send({
        success: false,
        message: 'Invalid API Key'
    });
  }
};
