'use strict';
const jsonWebToken = require('jsonwebtoken');

/**
  * verifyToken to verify token
  * Middleware to validate tokens
  * Except unauth routes
  * all others routues go through
  * verfiy Middleware
  */
module.exports = (req, res, next, app) => {
  // check header for token
  var token = req.headers['authorization'];

  // check header for API-Key
  var APIKey = req.headers['API-Key'];

  // validate and decode the token
  if (token) {
    // verifies jwtSecret and checks expiration
    jsonWebToken.verify(token, app.get('jwtSecret'), function(err, decoded) {
      if (err) {
        return res.status(403).json({ success: false, message: 'Login failed' });
      } else {
        // On success, saving to request object to use in other routes
        req.decoded = decoded;
        next();
      }
    });
  } else {
    // No token found
    // Returning 403 error
    return res.status(403).send({
        success: false,
        message: 'Login failed'
    });
  }
};
