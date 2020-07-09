const db = require('../models/index');
const Sequelize = require('sequelize');

async function getAuctions(userPubKey) {
  const res = [];
  if (!userPubKey) {
    const auctionDetails = await db.auctions.findAll();
    auctionDetails.forEach((element) => {
      if (element.dataValues.participants) {
        element.dataValues.participantCount =
          element.dataValues.participants.split(';').length;
      } else {
        element.dataValues.participantCount = 0;
      }
      if (element.dataValues.shortlistedBy) {
        element.dataValues.shortlistCount =
          element.dataValues.shortlistedBy.split(';').length;
      } else {
        element.dataValues.shortlistCount = 0;
      }
      res.push(element.dataValues);
    });
    return res;
  }
  const auctionDetails = await db.auctions.findAll({
    where: Sequelize.or({ buyer: userPubKey }, { seller: userPubKey }),
  });
  // check validity of userPubKey
  if (auctionDetails.length === 0) {
    return res;
  }
  auctionDetails.forEach((element) => {
    const detail = {};
    detail.assetId = element.assetId;
    detail.assetName = element.assetName;
    detail.assetDescription = element.assetDescription;
    detail.auctionType = element.auctionType;
    detail.contractAddress = element.contractAddress;
    detail.seller = element.seller;
    detail.buyer = element.buyer;
    if (userPubKey === element.buyer) {
      detail.participatedAs = 'bidder';
    } else if (userPubKey === element.seller) {
      detail.participatedAs = 'auctioneer';
    }
    detail.auctionParams = element.auctionParams;
    detail.auctionStatus = element.auctionStatus;
    if (element.participants) {
      detail.participantCount =
        element.participants.split(';').length;
    } else {
      detail.participantCount = 0;
    }
    if (element.shortlistedBy) {
      detail.shortlistCount =
        element.shortlistedBy.split(';').length;
    } else {
      detail.shortlistCount = 0;
    }
    detail.shortlisted = false;

    res.push(detail);
  });
  console.log({ res });
  const bidDetails = await db.bids.findOne({
    where: {
      userPubKey,
    },
  });
  if (!bidDetails) {
    return res;
  }
  bidDetails.shortlistedAuctionIds.split(';').forEach(async (element) => {
    const shortlistedAuctionDetails = await db.auctions.findOne({
      where: {
        assetId: element,
      },
    });
    const detail = {};
    detail.assetId = shortlistedAuctionDetails.assetId;
    detail.assetName = shortlistedAuctionDetails.assetName;
    detail.assetDescription = shortlistedAuctionDetails.assetDescription;
    detail.auctionType = shortlistedAuctionDetails.auctionType;
    detail.contractAddress = shortlistedAuctionDetails.contractAddress;
    detail.seller = shortlistedAuctionDetails.seller;
    detail.participatedAs = 'bidder';
    detail.auctionParams = shortlistedAuctionDetails.auctionParams;
    detail.auctionStatus = shortlistedAuctionDetails.auctionStatus;
    detail.shortlisted = true;
    detail.shortlistCount = shortlistedAuctionDetails.shortlistedBy.split(';').length;
    res.push(detail);
  });
  bidDetails.participatedAuctionIds.split(';').forEach(async (element) => {
    const participatedAuctionDetails = await db.auctions.findOne({
      where: { assetId: element },
    });
    const detail = {};
    detail.assetId = participatedAuctionDetails.assetId;
    detail.assetName = participatedAuctionDetails.assetName;
    detail.assetDescription = participatedAuctionDetails.assetDescription;
    detail.auctionType = participatedAuctionDetails.auctionType;
    detail.contractAddress = participatedAuctionDetails.contractAddress;
    detail.seller = participatedAuctionDetails.seller;
    detail.participatedAs = 'bidder';
    detail.auctionParams = participatedAuctionDetails.auctionParams;
    detail.auctionStatus = participatedAuctionDetails.auctionStatus;
    detail.participantCount = participatedAuctionDetails.participants.length;
    detail.shortlisted = false;

    res.push(detail);
  });
}

async function shortlistAuction(userPubKey, assetId) {
  // make entry for userPubKey in bid table in shortlistedAuctionIds and add userPubKey
  const bidDetails = await db.bids.findOrCreate({
    where: {
      userPubKey: userPubKey,
    },
  });
  // bidDetails = [instance, created]
  if (bidDetails[1]) {
    const shortlistedAuctionIds = [];
    shortlistedAuctionIds.push(assetId);
    await db.bids.update({ shortlistedAuctionIds: shortlistedAuctionIds.join(';') }, { where: { userPubKey } });
  } else {
    const shortlistedAuctionIds = bidDetails[0].shortlistedAuctionIds.split(';');
    let index = shortlistedAuctionIds.indexOf(assetId);
    if (index == -1) {
      shortlistedAuctionIds.push(assetId);
      await db.bids.update(
        { shortlistedAuctionIds: shortlistedAuctionIds.join(';') },
        { where: { userPubKey } },
      );
    } else {
      shortlistedAuctionIds.splice(index, 1);
      await db.bids.update(
        { shortlistedAuctionIds: shortlistedAuctionIds },
        { where: { userPubKey } },
      );
    }
  }
}

module.exports.getAuctions = getAuctions;
module.exports.shortlistAuction = shortlistAuction;
