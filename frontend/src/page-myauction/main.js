import { getOpByHashTzkt, getAuctions } from "../utils/api";
import { sleep } from "../utils/sleep";
import {
  startAuction,
  bid,
  resolveAuction,
  cancelAuction,
  dropPrice,
  acceptPrice,
} from "../utils/thanos";
import { connectWallet, checkAvailability, checkAndSetKeys } from "../common";
import {
  getEnglishAuctionTemplate,
  getDutchAuctionTemplate,
} from "../page-auction/templates";

/**
 * ---------------------------
 * Auction Contract
 * ---------------------------
 */

let walletAddress;

async function connectToThanos() {
  await checkAvailability();
  const walletInfo = await connectWallet();
  walletAddress = walletInfo.walletAddress;
}

async function onClickAuctionStart(contractAddress) {
  await connectToThanos();

  const { err, opHash } = await startAuction(contractAddress);
  if (err) {
    console.log("Error occured");
    alert(`Transaction failed: ${err}`);
    return;
  }

  console.log("Start auction succeeded with: ", opHash);
  return poll(opHash);
}

async function onClickResolveAuction(contractAddress) {
  await connectToThanos();

  const { err, opHash } = await resolveAuction(contractAddress);
  if (err) {
    console.log("Error occured");
    alert(`Transaction failed: ${err}`);
    return;
  }

  console.log("Resolve auction succeeded with: ", opHash);
  return poll(opHash);
}

async function onClickCancelAuction(contractAddress) {
  await connectToThanos();

  const { err, opHash } = await cancelAuction(contractAddress);
  if (err) {
    console.log("Error occured");
    alert(`Transaction failed: ${err}`);
    return;
  }

  console.log("Cancel auction succeeded with: ", opHash);
  return poll(opHash);
}

async function onClickDropPrice(contractAddress) {
  await connectToThanos();

  const { err, opHash } = await dropPrice(contractAddress);
  if (err) {
    console.log("Error occured");
    alert(`Transaction failed: ${err}`);
    return;
  }

  console.log("Drop price succeeded with: ", opHash);
  return poll(opHash);
}

async function onClickAcceptPrice(contractAddress, amount) {
  await connectToThanos();

  const { err, opHash } = await acceptPrice(contractAddress, amount);
  if (err) {
    console.log("Error occured");
    alert(`Transaction failed: ${err}`);
    return;
  }

  console.log("Accept price succeeded with: ", opHash);
  return poll(opHash);
}

async function createBid(contractAddress, amount) {
  await connectToThanos();

  const { err, opHash } = await bid(contractAddress, amount);
  if (err) {
    console.log("Error occured");
    alert(`Transaction failed: ${err}`);
    return;
  }

  console.log("Bid for auction succeeded with: ", opHash);
  return poll(opHash);
}

async function poll(opHash, retries = 10) {
  try {
    if (!retries) {
      return {
        err: "Timeout exceeded",
      };
    }

    const tzktOpdata = await getOpByHashTzkt(opHash);
    console.log("TZKT Operation data received: ", tzktOpdata);

    if (tzktOpdata !== null && tzktOpdata.length > 0) {
      const status = tzktOpdata[0].status;
      if (status === "applied") {
        alert("Transaction succeeded");
        return {
          err: null,
        };
      }
    }

    retries--;

    await sleep(5000);
    return poll(opHash, retries);
  } catch (error) {
    return poll(opHash, retries);
  }
}

/**
 * ---------------------
 * UI Bindings
 * ----------------------
 */

window.reconfigureAuction = async function (address, id) {
  localStorage.clear();
  localStorage.setItem("contractAddress", address);

  const auctionType = $(`#bid-item-${id}-type`).html();
  const assetName = $(`#bid-item-${id}-name`).html();
  localStorage.setItem("assetName", assetName);
  $("#aucnProdct").val(assetName);
  localStorage.setItem("auctionType", auctionType);
  $("#tab3-auction-type").html(auctionType);
  localStorage.setItem("reservePrice", 0);
  $("li.three").addClass("active");
  $("li.three").addClass("bold");
  await onClickConfigureAuction();
};

window.onClickConfigureAuction = onClickConfigureAuction;

window.relookAuctions = function (role) {
  $("#upcoming-list").html("");
  $("#ongoing-list").html("");
  $("#completed-list").html("");

  ongoingAuctionsCount = 0;
  upcomingAuctionsCount = 0;
  completedAuctionsCount = 0;

  $("#upcoming-count").html(upcomingAuctionsCount);
  $("#ongoing-count").html(ongoingAuctionsCount);
  $("#completed-count").html(completedAuctionsCount);

  updateAuctionData(role);
};

$("#prodct").on("click", onClickConfigureAuction);

window.onClickConfigureShip = function onClickConfigureShip(id) {
  const shipStatus = localStorage.getItem("shipStatus" + id);

  if (shipStatus === undefined || shipStatus === null) {
    localStorage.setItem("shipStatus" + id, "shipped");
    $("body").addClass("bidding");
  } else {
    const trackStatus = localStorage.getItem("trackStatus" + id);
    console.log(trackStatus);

    $("body").addClass("tracking");

    if (trackStatus === undefined || trackStatus === null) {
      $("lottie-player.sending2").hide();
      localStorage.setItem("trackStatus" + id, "inTransit");
    } else if (trackStatus === "inTransit" || trackStatus === "done") {
      $(".finisfTrack .sending").hide();
      $("lottie-player.sending2").show();
      $("#track-status").css({ height: "20px" });
      $("div.countDown").hide();
      $("body").addClass("nextOnTrack");

      $("#track-status").html("DELIVERED");
      $("#track-text").html("The funds are being transferred to the seller.");
      localStorage.setItem("trackStatus" + id, "done");
    }
  }
};

$(".trackDone").on("click", function () {
  $("div.countDown").hide();
  $("body").addClass("nextOnTrack");
});

$(".trackClose").on("click", function () {
  $(".finisfTrack.sending2").hide();
  $("body").removeClass("nextOnTrack tracking");
});

$(".auctioBid").on("click", onClickConfigureShip);

async function onClickConfigureAuction() {
  // Check Thanos Availability
  await connectToThanos();

  checkAndSetKeys();
  checkImageFileSelection();

  // Open slider
  $("body").addClass("openSlide");
  $(".menuBox ul li.prodct").addClass("active");
}

function checkImageFileSelection() {
  const x = document.getElementById("myFile");
  var txt = "";
  if ("files" in x) {
    if (x.files.length == 0) {
      txt = "Select one or more files.";
    } else {
      for (var i = 0; i < x.files.length; i++) {
        txt += "<br><strong>" + (i + 1) + ". file</strong><br>";
        var file = x.files[i];
        if ("name" in file) {
          //txt += "name: " + file.name + "<br>";
          element.classList.add("mystyle");
        }
      }
    }
  }

  document.getElementById("fileError").innerHTML = txt;
}

window.bid = async function (auctionAddress) {
  const amount = 1e-6;

  await createBid(auctionAddress, amount);
};

window.startAuction = async function (auctionAddress) {
  await onClickAuctionStart(auctionAddress);
};

// TODO: fill this with API
window.shortlistAuction = function () {
  console.log("Shortlist auction invoked");
};

window.resolveAuction = async function (auctionAddress) {
  await onClickResolveAuction(auctionAddress);
};

window.cancelAuction = async function (auctionAddress) {
  await onClickCancelAuction(auctionAddress);
};

window.dropPrice = async function (auctionAddress) {
  await onClickDropPrice(auctionAddress);
};

window.acceptPrice = async function (auctionAddress, id) {
  const price = $(`#bid-item-${id}-price`).html().split(" XTZ")[0];
  console.log(price);
  await onClickAcceptPrice(auctionAddress, price);
};

$(document).ready(async function () {
  updateAuctionData();
  await connectToThanos();
});

/**
 * ----------------------
 * Auctions populate
 * ----------------------
 */

let upcomingAuctionsCount = 0,
  ongoingAuctionsCount = 0,
  completedAuctionsCount = 0,
  auctions;

async function updateAuctionData(role = "all") {
  upcomingAuctionsCount = 0;
  ongoingAuctionsCount = 0;
  completedAuctionsCount = 0;

  if (auctions === undefined || auctions === null) {
    auctions = await getAuctions();
  }

  for (let i = 0; i < auctions.length; i++) {
    console.log("Buyer: ", auctions[i].buyer);
    console.log("Seller: ", auctions[i].seller);

    switch (role) {
      case "buyer":
        if (auctions[i].buyer != walletAddress) continue;
        break;
      case "seller":
        if (auctions[i].seller != walletAddress) continue;
        break;
      case "all":
      default:
        if (
          auctions[i].seller != walletAddress &&
          auctions[i].buyer != walletAddress
        )
          continue;
        break;
    }

    populateAuctions(auctions[i], i);
  }

  const noAuctionsElement = `
  <div class="noFiles">

    <div class="catFile">
      <lottie-player class="" src="script/Cat.json" background="transparent" speed="1"
          style="width: 300px; height: 300px;" loop autoplay></lottie-player>

      <h3>No Auction to showcase now</h3>

      <a href="#" class="butn" onclick="onClickConfigureAuction()"><span>Auction your product</span></a>
    </div>


  </div>
  `;

  if (upcomingAuctionsCount === 0) {
    $("#upcoming-list").append(noAuctionsElement);
  }

  if (ongoingAuctionsCount === 0) {
    $("#ongoing-list").append(noAuctionsElement);
  }

  if (completedAuctionsCount === 0) {
    $("#completed-list").append(noAuctionsElement);
  }
}

function populateAuctions(auctionJson, id) {
  const auctionStatus = auctionJson.auctionStatus;
  const auctionName = auctionJson.assetName;
  const auctionType = getAuctionType(auctionJson.auctionType);
  const auctionDescription = auctionJson.assetDescription;
  const auctionParams = auctionJson.auctionParams;
  const auctionAddress = auctionJson.contractAddress;

  const auctionStartDate = new Date(auctionJson.startTime);
  const dateString =
    auctionStartDate.getDate() +
    " " +
    getMonthName(auctionStartDate.getMonth()) +
    ", " +
    auctionStartDate.getHours() +
    ":" +
    auctionStartDate.getMinutes() +
    " UTC";
  const assetImageFileName = auctionJson.assetImageFileName;
  const imgUrl = getImageUrl(assetImageFileName);
  const timeLeft = getTimeLeftForAuctionStart(auctionStartDate);

  const waitTime = auctionJson.roundTime;
  const auctionDuration = getAuctionDuration(waitTime);

  let owner;

  if (auctionStatus == "upcoming") {
    owner = auctionJson.seller;
  } else if (auctionStatus == "ongoing") {
    owner = auctionJson.seller;
  } else if (
    auctionStatus == "expired" ||
    auctionStatus == "unresolved" ||
    auctionStatus == "executed" ||
    auctionStatus == "cancelled"
  ) {
    owner = auctionJson.buyer;
  }

  // Get templates
  let auctionItemCard;

  if (auctionJson.auctionType === "english") {
    auctionItemCard = getEnglishAuctionTemplate(
      imgUrl,
      auctionName,
      auctionType,
      auctionStatus,
      owner,
      auctionDescription,
      auctionParams,
      timeLeft,
      dateString,
      auctionDuration,
      auctionJson.buyer,
      auctionJson.seller,
      walletAddress,
      auctionAddress,
      id
    );
  } else if (auctionJson.auctionType === "dutch") {
    auctionItemCard = getDutchAuctionTemplate(
      imgUrl,
      auctionName,
      auctionType,
      auctionStatus,
      owner,
      auctionDescription,
      auctionParams,
      timeLeft,
      dateString,
      auctionDuration,
      auctionJson.buyer,
      auctionJson.seller,
      walletAddress,
      auctionAddress,
      id
    );
  }

  if (auctionStatus == "upcoming") {
    upcomingAuctionsCount++;
    $("#upcoming-count").html(upcomingAuctionsCount);
    $("#upcoming-list").append(auctionItemCard);
  } else if (auctionStatus == "ongoing") {
    ongoingAuctionsCount++;
    $("#ongoing-count").html(ongoingAuctionsCount);
    $("#ongoing-list").append(auctionItemCard);
  } else if (
    auctionStatus == "expired" ||
    auctionStatus == "unresolved" ||
    auctionStatus == "executed" ||
    auctionStatus == "cancelled"
  ) {
    completedAuctionsCount++;
    $("#completed-count").html(completedAuctionsCount);
    $("#completed-list").append(auctionItemCard);
  }
}

function getAuctionType(auctionType) {
  const auctionTypeMapping = {
    english: "English Auction",
    dutch: "Dutch Auction",
    vickery: "Vickery",
    sealed_bid: "Sealed Bid",
  };

  return auctionTypeMapping[auctionType];
}

function getMonthName(monthNumber) {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return monthNames[monthNumber];
}

function getAuctionDuration(waitTime) {
  const waitHours = Math.floor(waitTime / (60 * 60));
  const waitMins = Math.ceil((waitTime - waitHours * (60 * 60)) / 60);

  return `${waitHours} hr ${waitMins} mins`;
}

function getTimeLeftForAuctionStart(auctionStartDate) {
  const diffTime = Math.abs(auctionStartDate - Date.now());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const rem = diffTime - diffDays * (1000 * 60 * 60 * 24);
  const diffHours = Math.ceil(rem / (1000 * 60 * 60));
  return `${diffDays} day ${diffHours} hrs`;
}

function getImageUrl(assetImageFileName) {
  return assetImageFileName == ""
    ? ""
    : `http://52.66.226.201:8080${assetImageFileName}`;
}
