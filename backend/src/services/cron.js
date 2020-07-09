const TezosApi = require('../utils/tezos');
const db = require('../models/index');

const Sequelize = require('sequelize');

const config = require('../config.js');
const auctionContractAddress = config.auctionContractAddress;

// TODO: put stuff propery in try catch
async function pollAuctionContract() {
  try {
    const contractHistory = await db.contractLastTimestamps.findOne({
      where: { contractAddress: auctionContractAddress },
    });
    let lastTimeStamp;
    if (!contractHistory) {
      await db.contractLastTimestamps.create({
        contractAddress: auctionContractAddress,
      });
      lastTimeStamp = '';
    } else {
      lastTimeStamp = contractHistory.lastTimeStamp;
    }

    let new_ops;
    // fetch all historical operations when server is started and the cron runs for the first time
    if (lastTimeStamp == '') {
      const resp = await TezosApi.getHistoricalOperations(
        auctionContractAddress,
      );
      lastTimeStamp = resp.lastTimeStamp;
      new_ops = resp.ops.reverse();
    } else {
      const resp = await TezosApi.getContractOperations(
        auctionContractAddress,
        '',
        new Date(lastTimeStamp).getTime(),
      );
      new_ops = resp.operations.reverse();
      lastTimeStamp = resp.operations[0].timestamp;
    }

    for (const new_op of new_ops) {
      // TODO: check all possible status
      if (new_op.status === 'failed' || new_op.status === 'backtracked') {
        continue;
      } else if (new_op.status != 'applied') {
        // what to do
        console.log('\n\n=======================Bugg=======================');
        console.log({ new_op });
        continue;
      }
      switch (new_op.entrypoint) {
        case 'configureAuction':
          const instanceStorageDetails = await TezosApi.getContractStorage(
            new_op.destination,
          );
          // save to auctions table
          let assetName = '';
          let assetDescription = '';
          let assetImageFileName = '';
          let assetId = '';
          let auctionType = '';
          let startTime = '';
          let roundTime = '';
          let auctionParams = {};
          instanceStorageDetails.children.forEach((element) => {
            switch (element.name) {
              // generic auction details
              case 'asset_id':
                assetId = element.value;
                break;
              case 'start_time':
                startTime = element.value;
                break;
              case 'round_time':
                roundTime = element.value;
                break;
              // English auction params
              case 'current_bid':
                auctionParams.highestBid = element.value;
                auctionParams.reservePrice = element.value;
                break;
              case 'min_increase':
                auctionParams.minIncrease = element.value;
                break;
              case 'highest_bidder':
                auctionParams.highestBidder = element.value;
                break;
              // Dutch auction params
              case 'current_price':
                auctionParams.currentPrice = element.value;
                auctionParams.openingPrice = element.value;
                break;
              case 'reserve_price':
                auctionParams.reservePrice = element.value;
                break;
              // Sealed bid auction params
              case 'deposit':
                auctionParams.deposit = element.value;
                break;
              case 'highest_bid':
                auctionParams.highestBid = element.value;
                break;
              case 'highest_bidder':
                auctionParams.highestBidder = element.value;
                break;
              default:
              //
            }
          });
          // If instance is reconfigured (i.e. the configureAuction entry_point has been called twice)
          // update auctionParams instead of creating
          const exists = await db.auctions.findOne({
            where: { contractAddress: new_op.destination },
          });
          if (exists) {
            await db.auctions.update(
              { auctionParams },
              { where: { contractAddress: new_op.destination } },
            );
            continue;
          }

          const masterStorageDetails = await TezosApi.getContractStorage(
            auctionContractAddress,
          );
          // 3rd element of masterStorageDetails.children is instance_map
          // as storage data is stored and sent alphabetically
          // therefore 1st -> dutch_factory, 2nd -> english_factory, 4th -> sealed_bid_factory, 5th ->vickrey_factory
          masterStorageDetails.children[3].children.forEach((assets) => {
            if (assets.name == assetId) {
              assets.children.forEach((element) => {
                switch (element.name) {
                  case 'asset_name':
                    assetName = element.value;
                    break;
                  case 'auction_type':
                    auctionType = element.value;
                    break;
                  default:
                  //
                }
              });
            }
          });
          const assetDetails = await db.assetDetails.findOne({
            where: { contractAddress: new_op.destination },
          });
          if (assetDetails) {
            assetDescription = assetDetails.assetDescription;
            assetImageFileName = assetDetails.assetImageFileName;
          }
          await db.auctions.create({
            seller: new_op.source,
            assetId,
            assetName,
            assetDescription,
            assetImageFileName,
            auctionType,
            contractAddress: new_op.destination,
            startTime,
            roundTime,
            auctionStatus: 'upcoming',
            buyer: new_op.source,
            auctionParams,
          });
          break;
        case 'startAuction':
          const instance = await db.contractLastTimestamps.findOne({
            where: { contractAddress: new_op.destination },
          });

          if (instance) continue;
          // save to contractLastTimestamps table
          await db.contractLastTimestamps.create({
            contractAddress: new_op.destination,
            lastTimeStamp: new_op.timestamp,
          });
          // change status to ongoing
          await db.auctions.update(
            { auctionStatus: 'ongoing' },
            { where: { contractAddress: new_op.destination } },
          );
          await pollInstanceContract(new_op.destination, new_op.timestamp);
          break;
        case 'destroyInstance':
            const auctionDetails = db.auctions.findOne({
                where: { contractAddress: new_op.source },
            });
            // set status as executed/cancelled in auctions table based on whether new owner is same as or different from old owner
            if (auctionDetails.seller === new_op.parameters.children[1].value){
                await db.auctions.update(
                    { auctionStatus: 'cancelled' },
                    { where: { contractAddress: new_op.source } },
                  );      
            } else {
                await db.auctions.update(
                    { auctionStatus: 'executed' },
                    { where: { contractAddress: new_op.source } },
                  );
            }
          // get participants and shortlistedBy from auctions table for contract_address
          // for each participant, clear this auction's id from their bid table entries
          const participantStr = auctionDetails.participants;
          if (participantStr) {
            const participants = participantStr.split(';');
            participants.forEach(async (participant) => {
              const bidDetails = await db.bids.findOrCreate({
                where: {
                  userPubKey: participant,
                },
              });
              const participatedAuctionIdsArrStr = bidDetails[0].participatedAuctionIds;
              const participatedAuctionIdsArr = participatedAuctionIdsArrStr.split(';');
              const bidsArrStr = bidDetails[0].bids;
              const bidsArr = bidsArrStr.split(';');

              let index = participatedAuctionIdsArr.indexOf(
                auctionDetails.assetId,
              );
              participatedAuctionIdsArr.splice(index, 1);
              bidsArr.splice(index, 1);
              await db.bids.update(
                {
                  participatedAuctionIds: participatedAuctionIdsArr.join(';'),
                  bids: bidsArr.join(';'),
                },
                { where: { userPubKey: participant } },
              );
            });
          }
          const shortlistedByStr = auctionDetails.shortlistedBy;
          if (shortlistedByStr) {
            const shortlistedBy = shortlistedByStr.split(';');
            shortlistedBy.forEach(async (userPubKey) => {
              const bidDetails = await db.bids.findOrCreate({
                where: {
                  userPubKey,
                },
              });
              const shortlistedAuctionIdsArrStr = bidDetails[0].shortlistedAuctionIds;
              const shortlistedAuctionIdsArr = shortlistedAuctionIdsArrStr.split(';');

              let index = shortlistedAuctionIdsArr.indexOf(
                auctionDetails.assetId,
              );
              shortlistedAuctionIdsArr.splice(index, 1);
              await db.bids.update(
                {
                  shortlistedAuctionIds: shortlistedAuctionIdsArr.join(';'),
                },
                { where: { userPubKey } },
              );
            });
          }
          // delete entry from contractLastTimestamps
          await db.contractLastTimestamps.destroy({
            where: { contractAddress: new_op.source },
          });
          break;
        case 'transferOwnership':
          // change owner in auctions table for contract_address
          // store transaction hash of this operation in contractAddress
          break;
        default:
          //
          break;
      }
    }
    await db.contractLastTimestamps.update(
      { lastTimeStamp },
      { where: { contractAddress: auctionContractAddress } },
    );
  } catch (err) {
    console.log({ err });
  }
}

async function pollAllInstanceContracts() {
   const upcomingAuctions = await db.auctions.findAll({
       where: {auctionStatus: "upcoming"}
   });
   upcomingAuctions.forEach(async (upcomingAuction) => {
       if (Date.now() > (new Date(upcomingAuction.startTime).getTime() + (upcomingAuction.roundTime * 1000) + 30000)) {
            await db.auctions.update(
                {auctionStatus: "expired"},
                { where: { contractAddress: upcomingAuction.contractAddress } },
            )
        }
   });
  // findAll from auctions from contractLastTimestamps where contractAddress != auctionContractAddress
  // poll till instance is destroyed and entry is deleted from contractLastTimestamps
  const liveAuctions = await db.contractLastTimestamps.findAll({
    where: { contractAddress: { [Sequelize.Op.not]: auctionContractAddress } },
  });
  for (const iterator of liveAuctions) {
    await pollInstanceContract(
      iterator.dataValues.contractAddress,
      iterator.dataValues.lastTimeStamp,
    );
  }
}

// TODO: put stuff propery in try catch
async function pollInstanceContract(contractAddress, lastTimeStamp) {
  try {
    const auctionDetails = await db.auctions.findOne({
      where: { contractAddress: contractAddress },
    });

    lastTimeStamp =
      lastTimeStamp == '' ? '' : new Date(lastTimeStamp).getTime();

    let new_ops;
    if (lastTimeStamp == '') {
      const resp = await TezosApi.getHistoricalOperations(contractAddress);
      lastTimeStamp = resp.lastTimeStamp;
      new_ops = resp.ops.reverse();
    } else {
      const resp = await TezosApi.getContractOperations(
        contractAddress,
        '',
        new Date(lastTimeStamp).getTime(),
      );
      new_ops = resp.operations.reverse();
      lastTimeStamp = resp.operations[0].timestamp;
    }

    for (const new_op of new_ops) {
      if (new_op.status === 'failed') {
        continue;
      } else if (new_op.status != 'applied') {
        // what to do
        console.log('\n\n=======================Bugg=======================');
        console.log({ new_op });
        continue;
      }
      switch (auctionDetails.auctionType) {
        case 'english':
          // check for "bid" entrypoint
          // store highest_bid and highest_bidder in auction_params JSON in auctions table
          if (new_op.entrypoint === 'bid') {
            const auctionParticipantsInfo = await db.auctions.findOne({
                where: { contractAddress: contractAddress },
              });
            auctionDetails.auctionParams.highestBiddder = new_op.source;
            auctionDetails.auctionParams.highestBid = new_op.amount;
            let participantsStr = auctionParticipantsInfo.participants;
            if (participantsStr) {
                const participantsArr = participantsStr.split(';');
                const exists = participantsArr.includes(new_op.source)
                if (!exists){
                    participantsArr.push(new_op.source);
                    participantsStr = participantsArr.join(';');
                }
            } else {
                participantsStr = new_op.source;
            }
            await db.auctions.update(
              {
                auctionParams: auctionDetails.auctionParams,
                participants: participantsStr,
              },
              { where: { contractAddress: auctionDetails.contractAddress } },
            );
            // make entry for source account in bid table and add source account as participant in auctions table
            const bidDetails = await db.bids.findOrCreate({
              where: {
                userPubKey: new_op.source,
              },
            });
            // bidDetails = [instance, created]
            if (bidDetails[1]) {
              await db.bids.update(
                { participatedAuctionIds: auctionDetails.assetId, bids: new_op.amount },
                { where: { userPubKey: new_op.source } },
              );
            } else {
              const participatedAuctionIdsArrStr = bidDetails[0].participatedAuctionIds;
              const participatedAuctionIdsArr = participatedAuctionIdsArrStr.split(';');
              const bidsArrStr = bidDetails[0].bids;
              const bidsArr = bidsArrStr.split(';');

              let index = participatedAuctionIdsArr.indexOf(
                auctionDetails.assetId,
              );
              if (index == -1) {
                participatedAuctionIdsArr.push(
                  auctionDetails.assetId,
                );
                bidsArr.push(new_op.amount);
                await db.bids.update(
                  {
                    participatedAuctionIds:
                    participatedAuctionIdsArr.join(';'),
                    bids: bidsArr.join(';'),
                  },
                  { where: { userPubKey: new_op.source } },
                );
              } else {
                bidsArr[index] = new_op.amount;
                await db.bids.update(
                  { bids: bidsArr.join(';') },
                  { where: { userPubKey: new_op.source } },
                );
              }
            }
          }
          break;
        case 'dutch':
          // check for "dropPrice" entrypoint
          // store current_price in auction_params JSON in auctions table
          if (new_op.entrypoint === 'dropPrice') {
            auctionDetails.auctionParams.currentPrice = new_op.parameters.value;
            await db.auctions.update(
              { auctionParams: auctionDetails.auctionParams },
              { where: { contractAddress: auctionDetails.contractAddress } },
            );
          }
          break;
        case 'sealed-bid':
          // check for "submitSealedBid" entrypoint
          // add source account as participant in auctions table
          // check for "revealBid" entrypoint
          // after each call, check for highest_bid and highest_bidder in storage or in transaction storage_diff,
          // and update auction_params JSON in auctions table
          break;
        case 'vickrey':
          //
          break;
        default:
        //
      }
    }
    if ((auctionDetails.auctionStatus === "ongoing") && (Date.now() > (new Date(auctionDetails.startTime).getTime() + (auctionDetails.roundTime * 1000) + 30000))) {
        await db.auctions.update(
            {auctionStatus: "unresolved"},
            { where: { contractAddress: contractAddress } },
        )
        await db.contractLastTimestamps.destroy(
            { where: { contractAddress: contractAddress } },
        );
    } else {
        await db.contractLastTimestamps.update(
          { lastTimeStamp },
          { where: { contractAddress: contractAddress } },
        );
    }
  } catch (err) {
    console.log({ err });
  }
}

module.exports.pollAuctionContract = pollAuctionContract;
module.exports.pollInstanceContracts = pollAllInstanceContracts;
