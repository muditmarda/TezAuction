import { getOpByHashTzkt, getContractStorage } from "../utils/api";
import { sleep } from "../utils/sleep";
import {
  isAvailable,
  connect,
  getWalletInfo,
  createInstance,
  configureAuction,
} from "../utils/thanos";

/**
 * --------------------------------
 * Wallet
 * --------------------------------
 */

// Wallet State
const NOT_CONNECTED = "not-connected";
const CONNECTING = "connecting";
const CONNECTED = "connected";

let walletState = NOT_CONNECTED;
let walletAddress;

export async function checkAvailability() {
  console.log("Checking thanos wallet availability ...");
  const available = await isAvailable();
  if (!available) {
    alert("Thanos Wallet is not available");
  }
}

export async function connectWallet() {
  console.log("Connecting to RPC ...");
  walletState = CONNECTING;
  await connect();

  console.log("Fetch wallet info ...");
  const { tezos, address } = await getWalletInfo();
  console.log("Address of wallet: ", address);
  walletState = CONNECTED;
  walletAddress = address;

  return { walletAddress, walletState };
}

/**
 * ---------------------------
 * Auction Contract
 * ---------------------------
 */

let contractAddress;

async function createAuctionInstance(assetName, auctionType) {
  const { err, opHash } = await createInstance(0, assetName, auctionType);
  $("#chooseAuctionResult").html(
    `<a href="https://carthage.tzkt.io/${opHash}" target="blank">${opHash.slice(
      0,
      11
    )}...</a>`
  );
  if (err) {
    console.log("Error occured");
    return;
  }

  console.log("Create Instance succeeded with: ", opHash);

  const pollResult = await pollForAuctionAddress(opHash);
  console.log("Contract created at: ", pollResult.contractInstance);

  return pollResult;
}

async function pollForAuctionAddress(opHash, retries = 12) {
  try {
    if (!retries) {
      return {
        err: "Timeout exceeded",
        contractInstance: null,
      };
    }

    const tzktOpdata = await getOpByHashTzkt(opHash);
    console.log("TZKT Operation data received: ", tzktOpdata);

    if (
      tzktOpdata !== null &&
      tzktOpdata.length > 0 &&
      tzktOpdata.length == 4
    ) {
      const status = tzktOpdata[2].status;
      if (status === "applied") {
        return {
          err: null,
          contractInstance: tzktOpdata[2].originatedContract.address,
        };
      } else {
        return {
          err: "Transaction failed",
          contractInstance: null,
        };
      }
    }

    await sleep(5000);
    return pollForAuctionAddress(opHash, retries - 1);
  } catch (error) {
    console.log(error);
    return pollForAuctionAddress(opHash, retries - 1);
  }
}

async function pollForAuctionConfigure(opHash, retries = 12) {
  try {
    if (!retries) {
      return false;
    }

    const tzktOpdata = await getOpByHashTzkt(opHash);
    console.log("TZKT Operation data received: ", tzktOpdata);

    if (
      tzktOpdata !== null &&
      tzktOpdata.length > 0 &&
      tzktOpdata.length == 2
    ) {
      const status = tzktOpdata[1].status;
      if (status === "applied") {
        return true;
      }
      return false;
    }

    await sleep(5000);
    return pollForAuctionConfigure(opHash, retries - 1);
  } catch (error) {
    console.log(error);
    return pollForAuctionConfigure(opHash, retries - 1);
  }
}

// Configure auction
async function configureAuctionInstance(
  contractInstance,
  increment,
  reservePrice,
  starttime,
  waittime
) {
  const configureAuctionResult = await configureAuction(
    contractInstance,
    increment,
    reservePrice,
    starttime,
    waittime
  );

  if (configureAuctionResult.err) {
    console.log("Error occured");
    return;
  }

  console.log(
    "Create Instance succeeded with: ",
    configureAuctionResult.opHash
  );

  return configureAuctionResult.opHash;
}

/**
 * ---------------------
 * UI Bindings
 * ----------------------
 */

export function checkAndSetKeys() {
  const assetName = localStorage.getItem("assetName");
  if (!assetName) return;

  $("#auctnProdct").val(assetName);
  $("#auctnProdct").addClass("filled");
  $("#aucProParent").addClass("focused");
  $("li.one").addClass("active");
  $("li.one").addClass("bold");
  $("div#one.comnTab").addClass("active");

  auctionType = localStorage.getItem("auctionType");
  if (!auctionType) return;

  $("#auctionType").val(auctionType);

  if (localStorage.getItem("contractAddress")) {
    contractAddress = localStorage.getItem("contractAddress");
  } else {
    return;
  }

  $("li.two").addClass("active");
  $("li.one").removeClass("bold");
  $("li.two").addClass("bold");
  $("div#one.comnTab").removeClass("active");
  $("div#two.comnTab").addClass("active");
  // $(".tabHead ul li.one").addClass("disabled").css("opacity", 0.5);
  // $(".tabHead ul li.two").addClass("disabled").css("opacity", 0.5);
  // $("#chooseAuctionBtn").prop("disabled", true).css("opacity", 0.5);

  const reservePrice = localStorage.getItem("reservePrice");
  const increment = localStorage.getItem("increment");
  const datepicker = localStorage.getItem("datepicker");
  const timepicker = localStorage.getItem("timepicker");
  const waithour = localStorage.getItem("waithour");
  const waitmin = localStorage.getItem("waitmin");

  if (!reservePrice) return;
  $("#reservePrice").val(reservePrice);

  if (!increment) return;
  $("#increment").val(increment);

  if (!datepicker) return;
  $("#datepicker").val(datepicker);

  if (!timepicker) return;
  $("#timepicker").val(timepicker);

  if (!waithour) return;
  $("#waithour").val(waithour);

  if (!waitmin) return;
  $("#waitmin").val(waitmin);

  $("li.three").addClass("active");
  $("li.two").removeClass("bold");
  $("li.three").addClass("bold");
  $("div#two.comnTab").removeClass("active");
  $("div#three.comnTab").addClass("active");
  // $(".tabHead ul li.three").addClass("disabled").css("opacity", 0.5);
  // $("#configureAuctionBtn").prop("disabled", true).css("opacity", 0.5);

  getContractStorage(contractAddress).then((storage) => {
    setStorage(storage);
  });
}

// Fill asset name and click
$(".sbmt.first").on("click", function () {
  const assetName = $("#auctnProdct").val();

  if (assetName.length < 1) {
    $(".aucPro.error").show();
    $("#auctnProdct").focus();
    return;
  }

  localStorage.setItem("assetName", assetName);

  $(".tabHead ul li.two").addClass("active");
  $(".tabHead ul li.two").addClass("bold");

  $("#two").addClass("active");
  $("#one").removeClass("active");
  $(".one").removeClass("bold");
});

export function hideSlider() {
  // UI
  $("body").removeClass("openSlide");
  $(".menuBox ul li.prodct").removeClass("active");
  $("body").addClass("overlaLoader");
}

function redirect(status) {
  $("body").removeClass("overlaLoader");
  $(".wrp").hide();

  if (!status) {
    $(".failure").show();

    setTimeout(() => {
      $(location).attr("href", "/");
    }, 2000);
    return;
  }

  $(".success").show();
  setTimeout(() => {
    $(location).attr("href", "/viewauctions");
  }, 2000);
}

/**
 * -------------------------
 * Choose Auction
 * -------------------------
 */

window.chooseAuction = async function () {
  const assetName = $("#auctnProdct").val();

  localStorage.setItem("auctionType", auctionType);

  $("#chooseAuctionBtn").prop("disabled", true).css("opacity", 0.5);
  $(".ldngAuctn").show();

  await checkAvailability();
  const result = await createAuctionInstance(assetName, auctionType);

  if (!result) {
    // $("#chooseAuctionError").html(result.err);
    $("#chooseAuctionBtn").prop("disabled", false).css("opacity", 1);
    $(".ldngAuctn").hide();
    $(".creatdAuctn").hide();
    return;
  }

  contractAddress = result.contractInstance;
  if (!contractAddress) {
    $("#chooseAuctionBtn").prop("disabled", false).css("opacity", 1);
    $(".ldngAuctn").hide();
    $("#chooseAuctionResult").html("❌ Failed...");
    $(".creatdAuctn").show();
    return;
  }

  localStorage.setItem("contractAddress", contractAddress);
  await sleep(2000);

  changeConfigureFormByAuctionType(auctionType);

  // UI
  $(".tabHead ul li.two").removeClass("bold");

  $(".tabHead ul li.three").addClass("active");
  $(".tabHead ul li.three").addClass("bold");

  $("#three").addClass("active");
  $("#two").removeClass("active");

  $(".tabHead ul li.one").addClass("disabled").css("opacity", 0.5);
  $(".tabHead ul li.two").addClass("disabled").css("opacity", 0.5);
  $(".ldngAuctn").css("visibility: hidden");
  $(".creatdAuctn").show();
  $("#tab3-auction-type").html(getAuctionType());
};

/**
 * ------------------------------
 * Configure Auction
 * ------------------------------
 */

export function getAuctionType() {
  const auctionTypeMapping = {
    english: "English Auction",
    dutch: "Dutch Auction",
    vickrey: "Vickrey",
    "sealed bid": "Sealed Bid",
  };

  return auctionTypeMapping[auctionType];
}

window.configureAuction = async function () {
  const reservePrice = $("#reservePrice").val();
  const increment = $("#increment").val();
  const datepicker = $("#datepicker").val();
  const timepicker = $("#timepicker").val();
  const waithour = $("#waithour").val();
  const waitmin = $("#waitmin").val();

  if (isNaN(reservePrice)) {
    $(".Reserve.error").show();
    return;
  } else {
    $(".Reserve.error").hide();
  }

  if (isNaN(increment)) {
    $(".Increment.error").show();
    return;
  } else {
    $(".Increment.error").hide();
  }

  if (!timepicker) {
    $(".Time.error").show();
    return;
  } else {
    $(".Time.error").hide();
  }

  if (!datepicker) {
    $(".Date.error").show();
    return;
  } else {
    $(".Date.error").hide();
  }

  localStorage.setItem("reservePrice", reservePrice);
  localStorage.setItem("increment", increment);
  localStorage.setItem("datepicker", datepicker);
  localStorage.setItem("timepicker", timepicker);
  localStorage.setItem("waithour", waithour);
  localStorage.setItem("waitmin", waitmin);

  const monthName = datepicker.split(" ")[0];
  const month = (() => {
    const mapping = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    return mapping[monthName.toLowerCase()];
  })();
  const date = datepicker.split(" ")[1].split(",")[0];
  const year = datepicker.split(" ")[2];

  let starttime;
  const tzOffset = new Date().getTimezoneOffset();

  const symbol = tzOffset < 0 ? "+" : "-";
  let tzOffsetHours = Math.floor(Number(Math.abs(tzOffset) / 60));
  const tzOffsetMins = Math.abs(tzOffset) - tzOffsetHours * 60;

  tzOffsetHours = tzOffsetHours < 10 ? "0" + tzOffsetHours : tzOffsetHours;

  const isAM = timepicker.includes("AM");
  if (isAM) {
    let hour = timepicker.split(":")[0];
    const min = timepicker.slice(0, -3).split(":")[1];

    starttime = `${year}-${month}-${date}T${hour}:${min}:00${symbol}${tzOffsetHours}:${tzOffsetMins}`;
  } else {
    let hour = timepicker.split(":")[0];
    const min = timepicker.slice(0, -3).split(":")[1];

    hour = Number(hour) + 12;
    starttime = `${year}-${month}-${date}T${hour}:${min}:00${symbol}${tzOffsetHours}:${tzOffsetMins}`;
  }

  const waittime = Number(waithour) * 60 * 60 + Number(waitmin) * 60;

  console.log(contractAddress, increment, reservePrice, starttime, waittime);

  try {
    await checkAvailability();
    const opHash = await configureAuctionInstance(
      contractAddress,
      increment,
      reservePrice,
      starttime,
      waittime
    );

    $(".aucPro").hide();
    $(".wrenchBox").show();

    const storage = await getContractStorage(contractAddress);
    setStorage(storage, contractAddress);

    console.log("submitting form");
    await submitForm();

    await sleep(3000);

    const status = await pollForAuctionConfigure(opHash);
    $(".wrenchBox").hide();
    $(".procesComplete").show();

    $(".tabHead ul li.three").addClass("disabled").css("opacity", 0.5);
    $("#configureAuctionBtn").prop("disabled", true).css("opacity", 0.5);
    localStorage.clear();
  } catch (error) {}
};

let auctionType;

window.setAuctionType = function (type) {
  auctionType = type;
  $("#tab3-auction-type").html(getAuctionType());
};

async function submitForm() {
  return new Promise((resolve, reject) => {
    var form = $("#auction-details-form")[0];

    // Create an FormData object
    var data = new FormData(form);

    $.ajax({
      type: "POST",
      enctype: "multipart/form-data",
      url: "http://54.172.0.221:8080/update-auction-details",
      data: data,
      processData: false,
      contentType: false,
      cache: false,
      timeout: 800000,
      success: function (data) {
        console.log("SUCCESS : ", data);
        return resolve(data);
      },
      error: function (e) {
        console.log("ERROR : ", e);
        return reject(e);
      },
    });
  });
}

function setStorage(instanceStorageDetails, contractAddress) {
  let assetId = "";
  let startTime = "";
  let waitTime = "";
  let auctionParams = {};
  instanceStorageDetails.children.forEach((element) => {
    switch (element.name) {
      // generic auction details
      case "asset_id":
        assetId = element.value;
        break;
      case "start_time":
        startTime = element.value;
        break;
      case "wait_time":
        waitTime = element.value;
        break;
      // English auction params
      case "current_bid":
        auctionParams.currentBid = element.value;
        break;
      case "min_increase":
        auctionParams.minIncrease = element.value;
        break;
      case "highest_bidder":
        auctionParams.highestBidder = element.value;
        break;
      // Dutch auction params
      case "current_price":
        auctionParams.currentPrice = element.value;
        break;
      case "reserve_price":
        auctionParams.reservePrice = element.value;
        break;
      // Sealed bid auction params
      case "participation_fee":
        auctionParams.participationFee = element.value;
        break;
      case "highest_bid":
        auctionParams.highestBid = element.value;
        break;
      case "highest_bidder":
        auctionParams.highestBidder = element.value;
        break;
      default:
      //
    }
  });

  $("#assetId").val(assetId);
  $("#auctionType").val(auctionType);
  $("#startTime").val(startTime);
  $("#waitTime").val(waitTime);
  $("#auctionParams").val(JSON.stringify(auctionParams));
  $("#userPubKey").val(walletAddress);
  $("#contractAddress").val(contractAddress);
}

function changeConfigureFormByAuctionType(auctionType) {
  switch (auctionType) {
    case "dutch":
      $("#tab3-auction-type").html("Dutch Auction");
      $("#fieldInfoTooltip1").html(
        "Base Price below which the price cannot be decreased"
      );
      $("#increment").placeholder = "Opening Price (in XTZ)";
      $("#fieldInfoTooltip2").html("Auction Starting Price");
      break;
    case "sealed bid":
      $("#tab3-auction-type").html("Sealed Bid Auction");
      $("#reservePrice").placeholder = "Deposit amount (in XTZ)";
      $("#fieldInfoTooltip1").html("Deposit for bidders to participate");
      $("#secondAuctionDetailField").hide();
      break;
    case "vickrey":
      $("#tab3-auction-type").html("Vickrey Auction");
      $("#reservePrice").placeholder = "Deposit amount (in XTZ)";
      $("#fieldInfoTooltip1").html("Deposit for bidders to participate");
      $("#secondAuctionDetailField").hide();
      break;
    default:
    //
  }
}

$(document).ready(function () {
  // Hide animations
  $(".ldngAuctn").hide();
  $(".creatdAuctn").hide();

  $(document).on("submit", "#auction-details-form", function () {
    return false;
  });

  sleep(500).then(() => {
    isAvailable().then((available) => {
      if (available) {
        $(".thanos-banner").hide();
        $(".conectd").toggleClass("wallet-exists");
        $("#thanos-status").html("Connected");
        $("#droptip-text").html(`Thanos Wallet connected`);
      }
    });
  });
});
