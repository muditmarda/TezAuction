module.exports = (sequelize, Sequelize) => {
  const contractLastTimestampModel = sequelize.define('contractLastTimestamps', {
    contractAddress: {
      type: Sequelize.STRING,
      primaryKey: true,
    },
    lastTimeStamp: {
      type: Sequelize.STRING,
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

  return contractLastTimestampModel;
};
