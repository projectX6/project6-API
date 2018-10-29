'use strict';
const fs = require('fs');
const path = require('path');
const basename = path.basename(module.filename);
const Sequelize = require('sequelize');
const db = {};

let sequelize = new Sequelize(process.env.DB,process.env.DB_USER,process.env.DB_PASSWORD, {
  host:process.env.DB_HOST,
  dialect: 'mysql',
  logging: false,
  pool: {
    max: 20,
    min: 0,
    idle: 10000
  }
});

fs.readdirSync(__dirname)
  .filter(file =>
    (file.indexOf('.') !== 0) &&
    (file !== basename) &&
    (file.slice(-3) === '.js'))
  .forEach(file => {
    const model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
