module.exports = (sequelize, Sequelize) => {
  const BidModel = sequelize.define('bids', {
    userPubKey: {
      type: Sequelize.STRING,
      primaryKey: true,
    },
    participatedAuctionIds: {
      type: Sequelize.TEXT,
      defaultValue: '',
    },
    bids: {
      type: Sequelize.TEXT,
      defaultValue: '',
    },
    shortlistedAuctionIds: {
      type: Sequelize.TEXT,
      defaultValue: '',
    },
    createdAt: {
      type: 'TIMESTAMP',
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: 'TIMESTAMP',
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  return BidModel;
};
