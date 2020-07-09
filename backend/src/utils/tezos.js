const axios = require('axios').default;
const network = 'carthagenet';
const baseURL = 'https://api.better-call.dev/v1';
const api = axios.create({
  baseURL: baseURL,
  timeout: 30000,
  responseType: 'json',
});

// const tzkt = axios.create({
//   baseURL: 'https://api.carthage.tzkt.io/v1/',
//   timeout: 30000,
//   responseType: 'json',
// });
// function getOperationHistory(address) {
//   const params = {
//     lastId: 0,
//     limit: 100,
//     sort: 0,
//   };
//   return tzkt
//     .get(`accounts/${address}/operations`, {
//       params,
//     })
//     .then((res) => {
//       if (!res) {
//         return res;
//       }
//       if (res.status != 200) {
//         return displayError(res);
//       }
//       console.log(res.data);
//       return res.data;
//     });
// }

function getContractOperations(
  address,
  last_id = '',
  from = 0,
  to = 0,
  statuses = [],
  entrypoints = [],
) {
  let params = {};
  if (last_id != '') {
    params.last_id = last_id;
  }
  if (from !== 0) {
    params.from = from;
  }
  if (to !== 0) {
    params.to = to;
  }
  if (statuses.length > 0 && statuses.length < 4) {
    params.status = statuses.join(',');
  }
  if (entrypoints.length > 0) {
    params.entrypoints = entrypoints.join(',');
  }

  return api
    .get(`/contract/${network}/${address}/operations`, {
      params: params,
    })
    .then((res) => {
      if (!res) {
        return res;
      }
      if (res.status != 200) {
        return displayError(res);
      }
      return res.data;
    });
}

async function getHistoricalOperations(address) {
    let responses = [];
    let opId = '';
    let lastTimeStamp = '';
  
    while (true) {
      const resp = await getContractOperations(
        address,
        opId,
      );
      if (resp.operations && resp.operations && resp.operations.length === 0) break;
      if (!lastTimeStamp.length && resp.operations && resp.operations.length){
        lastTimeStamp = resp.operations[0].timestamp
      }
  
      opId = resp.last_id;
      responses = responses.concat(resp.operations);
    }
  
    return {
      ops: responses,
      lastTimeStamp,
    };
}
    
function getContractStorage(address) {
  return api.get(`/contract/${network}/${address}/storage`).then((res) => {
    if (res.status != 200) {
      return displayError(res);
    }
    return res.data;
  });
}

module.exports.getContractStorage = getContractStorage;
module.exports.getContractOperations = getContractOperations;
module.exports.getHistoricalOperations = getHistoricalOperations;
