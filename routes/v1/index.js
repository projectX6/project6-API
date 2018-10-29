'use strict';
const verifyToken = require('./verify');
const verifyAPIKey = require('./verifyAPIKey');
const users = require('./users');
const ingredients = require('./ingredients');
const attributes = require('./attributes');
const categories = require('./categories');
const products = require('./products');
const openProducts = require('./open/products');
const sizes = require('./sizes');
const apps = require('./apps');
const app_translations = require('./app_translations');
const countries = require('./countries');
const products_translations = require('./products_translations');
const categories_translation = require('./categories_translation');
const ingredients_translations = require('./ingredients_translations');
// const products_has_attrributes_translations = require('./products_has_attrributes_translations');
// const professional_application_translations = require('./professional_application_translations');
const openApp_translations = require('./open/app_translations');
const openCountries = require('./open/countries');
const settings = require('./settings');
const roles = require('./roles');
const recommends = require('./recommends');
const open_recommends = require('./open/recommends');
const open_categories = require('./open/categories');
const open_ingredients = require('./open/ingredients');


// Router index file
module.exports = (app) => {
  const unauth = require('./unauth')(app);

  // Middleware to verify API-Key
  app.use('/api/v1/*', function (req, res, next) {
    verifyAPIKey(req, res, next, app);
  });

  // public API for acceessing products
  // Validates only API-Key
  app.use('/api/v1/open/products', openProducts);

  // public API for app transactions
  // Validates only API-Key
  app.use('/api/v1/open/getTranslations', openApp_translations);

  // public API for app transactions
  // Validates only API-Key
  app.use('/api/v1/open/recommends', open_recommends);

  // public API for app transactions
  // Validates only API-Key
  app.use('/api/v1/open/categories', open_categories);


  // public API for countries
  // Validates only API-Key
  // loads countries with all app keys and values
  app.use('/api/v1/open/countries', openCountries);

  // public API for ingredients
  // Validates only API-Key
  // loads countries with all app keys and values
  app.use('/api/v1/open/ingredients', open_ingredients);

  // used for authentication
  app.use('/api/v1', unauth);

  // Middleware to verify jsonWebToken
  app.use('/api/v1/*', function (req, res, next) {
    verifyToken(req, res, next, app);
  });

  // Loads users data
  app.use('/api/v1/users', users);

  // Loads ingredients data
  app.use('/api/v1/ingredients', ingredients);

  // Loads attributes data
  app.use('/api/v1/attributes', attributes);

  // Loads categories data
  app.use('/api/v1/categories', categories);

  // Loads products data
  app.use('/api/v1/products', products);

  // Loads sizes data
  app.use('/api/v1/sizes', sizes);

  // Loads app apikey data
  // app.use('/api/v1/appapikey', appapikey);

  // Loads app data
  app.use('/api/v1/apps', apps);

  // Loads app translations data
  app.use('/api/v1/appTranslations', app_translations);

  // Loads countries data
  app.use('/api/v1/countries', countries);

  // Loads products translations data
  app.use('/api/v1/prodTranslations', products_translations);

  // Loads categories translation data
  app.use('/api/v1/catTranslation', categories_translation);

  // Loads ingredients translations data
  app.use('/api/v1/ingTranslations', ingredients_translations);

  // Loads attrribute Translations data
  // app.use('/api/v1/attrTranslations', products_has_attrributes_translations);

  // Loads Professional Application Translations data
  // app.use('/api/v1/profappTranslation', professional_application_translations);

  // Loads Settings data
  app.use('/api/v1/settings', settings);

  // Loads roles data
  app.use('/api/v1/roles', roles);

  // Loads recommends data
  app.use('/api/v1/recommends', recommends);
};
