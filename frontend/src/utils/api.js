const axios = require("axios").default;

// // Better Call Dev
const BASE_URL = "https://api.better-call.dev/v1";
const NETWORK = "carthagenet";

export async function getOpByHashBcd(hash) {
  console.log("Better call dev");
  const api = axios.create({
    baseURL: BASE_URL,
    timeout: 2000,
    responseType: "json",
  });
  return api.get(`/opg/${hash}`).then((res) => {
    if (res.status != 200) {
      throw new Error(res);
    }
    return res.data;
  });
}

// TZKT
const TZKT_BASE_URL = "https://api.carthage.tzkt.io/v1";

export async function getOpByHashTzkt(hash) {
  const api = axios.create({
    baseURL: TZKT_BASE_URL,
    timeout: 2000,
    responseType: "json",
  });
  return api.get(`/operations/${hash}`).then((res) => {
    if (res.status != 200) {
      throw new Error(res);
    }
    return res.data;
  });
}

// Backend URL
const BACKEND_BASE_URL = "http://54.172.0.221:8080";

export async function getAuctions() {
  const api = axios.create({
    baseURL: BACKEND_BASE_URL,
    timeout: 3000,
    responseType: "json",
  });
  return api.get(`/auctions`).then((res) => {
    if (res.status !== 200) {
      throw new Error(res);
    }
    return res.data;
  });
}

export async function getContractStorage(address) {
  const api = axios.create({
    baseURL: BASE_URL,
    timeout: 2000,
    responseType: "json",
  });

  return api.get(`/contract/${NETWORK}/${address}/storage`).then((res) => {
    if (res.status !== 200) {
      throw new Error(res);
    }
    return res.data;
  });
}
