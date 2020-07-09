const Cron = require('cron');
const cron = require('./services/cron');

// TODO: discuss and define granularity

function pollAuctionContractCronJob() {
  // Run CronJob Every Minute
  new Cron.CronJob(
    '* * * * *',
    function () {
      cron.pollAuctionContract();
    },
    null,
    true,
    'America/Los_Angeles',
  );
}

function pollInstaceContractsCronJob() {
  // Run CronJob Every Minute
  new Cron.CronJob(
    '*/2 * * * *',
    function () {
      cron.pollInstanceContracts();
    },
    null,
    true,
    'America/Los_Angeles',
  );
}

module.exports.pollAuctionContractCronJob = pollAuctionContractCronJob;
module.exports.pollInstaceContractsCronJob = pollInstaceContractsCronJob;
