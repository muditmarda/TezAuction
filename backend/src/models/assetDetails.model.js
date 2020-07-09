module.exports = (sequelize, Sequelize) => {
  const AssetDetailsModel = sequelize.define('assetDetails', {
    contractAddress: {
      type: Sequelize.STRING,
      primaryKey: true,
    },
    assetImageFileName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    assetDescription: {
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
  return AssetDetailsModel;
};
