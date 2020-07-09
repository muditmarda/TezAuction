const Status = {
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  EXECUTED: 'executed',
  UNRESOLVED: "unresolved",
  EXPIRED: "expired",
  CANCELLED: 'cancelled',
};

module.exports = (sequelize, Sequelize) => {
  const AuctionModel = sequelize.define('auctions', {
    seller: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    assetId: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    auctionType: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    // Transaction Hash is stored in contractAddress when transferOwnership operation is called
    contractAddress: {
      type: Sequelize.STRING,
      primaryKey: true,
    },
    buyer: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    assetName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    assetDescription: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    assetImageFileName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    auctionParams: {
      type: Sequelize.JSON,
      allowNull: false,
    },
    auctionStatus: {
      type: Sequelize.STRING,
      // values: [Status.PENDING, Status.ONGOING, Status.EXECUTED, Status.CANCELLED, Status.UNRESOLVED, Status.EXPIRED],
      defaultValue: Status.UPCOMING,
    },
    participants: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    shortlistedBy: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    startTime: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    roundTime: {
      type: Sequelize.STRING,
      allowNull: false,
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
  return AuctionModel;
};
