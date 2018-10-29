'use strict';
const dotenv = require('dotenv');
// Load config from .env
const result = dotenv.config();

// Check if config file is parsed without errors
if(result.error){
  throw result.error;
}

const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const jsonWebToken = require('jsonwebtoken');
const compression = require('compression');
const nocache = require('nocache');
const fs = require('fs');
// Require the bcrypt package
const bcrypt = require('bcrypt');

const app = express();

// Enable gzip compression
app.use(compression());

// Default limit of body is 1mb
// To increase the body size to 20mb
app.use(bodyParser.json({limit: '50mb'}));
// extended true will overcome the depricate error
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// The Secret key (Support jsonWebToken)
app.set('jwtSecret', process.env.JWT_KEY);

// Log request to the console
app.use(logger('dev'));

// Parse incoming requests data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(cors());

// Default root route
app.all('/',(req, res) => {
  res.send('PID API');
});

/**
 * To make static folder & files accessable from web
 */
app.use(express.static('static'));


/**
 * To make docs accessable from web
 */
app.use('/docs',express.static('docs'));
app.use('/openapidocs',express.static('openapidocs'));

// Disable Cache
app.use(nocache());

// V1 Routers
require('./routes/v1')(app);

// Setup a default catch-all route
app.all('*', (req, res) => {
  res.status(404).send('Not Found');
});

// Load User_API_key from models
const APP_API_key = require('./models').APP_API_key;
const sequelize = require('./models').sequelize;
// const ProductsReview = require('./models').Products_Review;
// const products = require('./models').products;
//
// ProductsReview.update({startDateTime: "2017-10-31 23:59:59", endDateTime: "2018-12-31 23:59:59"}, {where:{}})
// .then((row) => {
//   console.log(row);
// })
// products.update({startDateTime: "2017-10-31 23:59:59", endDateTime: "2018-12-31 23:59:59"}, {where:{}})
// .then((row) => {
//   console.log(row);
// })
// sequelize.query("INSERT INTO `Roles_has_Permissions` (`roles_id`, `permissions_id`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`) VALUES ('1', '6', '2017-11-22 10:56:13', '2017-11-22 10:56:13', 'admin', 'admin')");
// sequelize.query("UPDATE `Permissions` SET `feature`='ATTRIBUTES' WHERE `id`='2'");

const utils = require('./routes/v1/utils');
var transporter = utils.mailHelper();

process.on("uncaughtException", function(err) {
  console.log("uncaughtException", err.message);
  var mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@dermalogica.com',// sender address
    to: ['appdev@mobigesture.com'],
    subject: 'Welcome to PIM', // Subject line
    text: (new Date()).toUTCString() + "\n\n" +
        err.message + "\n\n" +
        err.stack
  };
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.error({
        "error": error.message
      });
    }
  });
});
process.on('unhandledRejection', function(err){
  console.log("unhandledRejection", err.message);
  var mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@dermalogica.com',// sender address
    to: ['appdev@mobigesture.com'],
    subject: 'Welcome to PIM', // Subject line
    text: (new Date()).toUTCString() + "\n\n" +
        err.message + "\n\n" +
        err.stack
  };
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.error({
        "error": error.message
      });
    }
  });
});
app.listen(process.env.PORT,() => {
  console.log('PID API Server listening on port ' + process.env.PORT);
  let APIkeys = [];
  return APP_API_key.findAll()
  .then(AppAPIkeys => {
    for (var i = 0; i < AppAPIkeys.length && AppAPIkeys !== undefined; i++) {
      APIkeys.push(AppAPIkeys[i].key)
    }
    // Set all APIkeys into the app
    app.set('APIkeys', APIkeys);
  })
  .catch(error => {
    app.set('APIkeys', APIkeys);
    console.error(error);
  });
});
