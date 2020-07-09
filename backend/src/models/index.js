const dbConfig = require('../config.js');

const Sequelize = require('sequelize');
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  timestamps: true,
  underscored: true,
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.auctions = require('./auction.model.js')(sequelize, Sequelize);
db.assetDetails = require('./assetDetails.model.js')(sequelize, Sequelize);
db.bids = require('./bid.model.js')(sequelize, Sequelize);
db.contractLastTimestamps = require('./contractLastTimestamp.model.js')(
  sequelize,
  Sequelize,
);

module.exports = db;
