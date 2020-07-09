import { ThanosWallet } from "@thanos-wallet/dapp";

let wallet, tzs, pkh;

export const APP_NAME = "DEX Auction dApp";
export const NETWORK = "carthagenet";
export const AUCTION_ADDRESS = "KT1EN3rEg171zisjuC117VkGSiBbkgrpJ8EN";

export async function isAvailable() {
  return ThanosWallet.isAvailable();
}

export async function connect(appName = APP_NAME, network = NETWORK) {
  wallet = new ThanosWallet(appName);
  await wallet.connect(network);
}

export async function getWalletInfo() {
  tzs = wallet.toTezos();
  pkh = await tzs.wallet.pkh();

  return {
    tezos: tzs,
    address: pkh,
  };
}

// Contract Related
const fetchContract = (tezos, address) => tezos.wallet.at(address);

export async function createInstance(assetID, assetName, auctionType) {
  try {
    const auction = await fetchContract(tzs, AUCTION_ADDRESS);
    console.log(auction);
    const { opHash } = await auction.methods
      .createInstance(assetID, assetName, auctionType)
      .send();
    console.log("operation hash for create instance: ", opHash);
    return {
      err: null,
      opHash,
    };
  } catch (error) {
    console.log("Error message: ", error.message);
    return { err: error.message, opHash: null };
  }
}

export async function configureAuction(
  address,
  minIncrease,
  reservePrice,
  startTime,
  waitTime
) {
  try {
    const auction = await fetchContract(tzs, address);
    const { opHash } = await auction.methods
      .configureAuction(minIncrease, reservePrice, waitTime, startTime)
      .send();
    console.log("operation hash for configure auction: ", opHash);
    return {
      err: null,
      opHash,
    };
  } catch (error) {
    console.log("Error message: ", error.message);
    return { err: error.message, opHash: null };
  }
}

export async function startAuction(address) {
  try {
    const auction = await fetchContract(tzs, address);
    const { opHash } = await auction.methods.startAuction({}).send();
    console.log("operation hash for start auction: ", opHash);
    return {
      err: null,
      opHash,
    };
  } catch (error) {
    console.log("Error message: ", error.message);
    return { err: error.message, opHash: null };
  }
}

export async function cancelAuction(address) {
  try {
    const auction = await fetchContract(tzs, address);
    const { opHash } = await auction.methods.cancelAuction({}).send();
    console.log("operation hash for cancel auction: ", opHash);
    return {
      err: null,
      opHash,
    };
  } catch (error) {
    console.log("Error message: ", error.message);
    return { err: error.message, opHash: null };
  }
}

export async function resolveAuction(address) {
  try {
    const auction = await fetchContract(tzs, address);
    const { opHash } = await auction.methods.resolveAuction({}).send();
    console.log("operation hash for resolve auction: ", opHash);
    return {
      err: null,
      opHash,
    };
  } catch (error) {
    console.log("Error message: ", error.message);
    return { err: error.message, opHash: null };
  }
}

export async function bid(address, amount) {
  try {
    const auction = await fetchContract(tzs, address);
    const { opHash } = await auction.methods.bid({}).send({ amount });
    console.log("operation hash for bid: ", opHash);
    return {
      err: null,
      opHash,
    };
  } catch (error) {
    console.log("Error message: ", error.message);
    return { err: error.message, opHash: null };
  }
}

export async function dropPrice(address, amount) {
  try {
    const auction = await fetchContract(tzs, address);
    const { opHash } = await auction.methods.dropPrice({}).send({ amount });
    console.log("operation hash for drop price: ", opHash);
    return {
      err: null,
      opHash,
    };
  } catch (error) {
    console.log("Error message: ", error.message);
    return { err: error.message, opHash: null };
  }
}

export async function acceptPrice(address, amount) {
  try {
    const auction = await fetchContract(tzs, address);
    const { opHash } = await auction.methods.acceptPrice({}).send({ amount });
    console.log("operation hash for accept price: ", opHash);
    return {
      err: null,
      opHash,
    };
  } catch (error) {
    console.log("Error message: ", error.message);
    return { err: error.message, opHash: null };
  }
}
