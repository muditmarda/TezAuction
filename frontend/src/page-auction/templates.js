import { BigNumber } from "bignumber.js";

export function getEnglishAuctionTemplate(
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
  buyer,
  seller,
  userPubKey,
  contractAddress,
  id
) {
  let button = "",
    maxBidElement = "",
    ownerElement = "",
    startDateElement = "",
    roundDurationElement = "",
    timeLeftElement = "";

  const minIncrease = new BigNumber(auctionParams.minIncrease)
    .div(1e6)
    .toFixed(6);
  const reservePrice = new BigNumber(auctionParams.reservePrice)
    .div(1e6)
    .toFixed(6);
  const highestBid = new BigNumber(auctionParams.highestBid)
    .div(1e6)
    .toFixed(6);

  if (auctionStatus == "upcoming") {
    if (userPubKey == seller) {
      button = `
      <div class="btnBox">
        <ul>
            <li>
              <a onclick="startAuction('${contractAddress}')">Start</a>
          </li>
        </ul>
      </div>
        `;
    } else if (userPubKey != seller && userPubKey != buyer) {
      button = `
      <div class="btnBox">
        <ul>
            <li>
              <a onclick="shortlistAuction('${contractAddress}')">Shortlist</a>
          </li>
        </ul>
      </div>
        `;
    }

    ownerElement = `
    <h3>
        Owner:
        <span class="owner">
            <a class="carthagelink" href="https://carthage.tzkt.io/${owner}" target="blank">${owner}</a>
        </span>
    </h3>
    `;

    timeLeft += " left";

    startDateElement = `
      <h2>Start Date</h2>
      <span class="auctionStartDate">${dateString}</span>
    `;
    roundDurationElement = `
        <h2>Round Duration</h2>
        <span class="auctionDuration">${auctionDuration}</span>
    `;
    timeLeftElement = `
    <h3 class="timeLeft">${timeLeft}</h3>
    `;
  } else if (auctionStatus == "ongoing") {
    if (userPubKey == seller) {
      button = `
      <div class="btnBox">
          <ul>
            <li>
              <a onclick="resolveAuction('${contractAddress}')">Resolve</a>
            </li>
            <li>
              <a onclick="cancelAuction('${contractAddress}')">Cancel</a>
            </li>
          </ul>
      </div>
      `;
    } else if (userPubKey != seller && userPubKey != buyer) {
      button = `
      <div class="btnBox">
          <ul>
            <li>
              <a class="auctioBid" onclick="bid('${contractAddress}')">Bid</a>
            </li>
          </ul>
      </div>
      `;
    }

    maxBidElement = `
    <h2>
        Highest Bid <span class="auctionReservePrice">${highestBid} XTZ</span>
    </h2>
    `;
    ownerElement = `
    <h3>
        Owner:
        <span class="owner">
            <a class="carthagelink" href="https://carthage.tzkt.io/${owner}" target="blank">${owner}</a>
        </span>
    </h3>
    `;

    timeLeft = "Ongoing";

    startDateElement = `
      <h2>Start Date</h2>
      <span class="auctionStartDate">${dateString}</span>
    `;
    roundDurationElement = `
        <h2>Round Ends In</h2>
        <span class="auctionDuration">${auctionDuration}</span>
    `;
    timeLeftElement = `
    <h3 class="timeLeft">${timeLeft}</h3>
    `;
  } else {
    // TODO:
    if (userPubKey == buyer) {
      button = `
      <div class="btnBox">
          <ul>
            <li>
              <a onclick="reconfigureAuction('${contractAddress}', '${id}')">Auction</a>
            </li>
          </ul>
      </div>
      `;
    }

    maxBidElement = `
    <h2>
        Winning Bid <span class="auctionReservePrice">${highestBid} XTZ</span>
    </h2>
    `;
    ownerElement = `
    <h3>
        Winner:
        <span class="owner">
            <a class="carthagelink" href="https://carthage.tzkt.io/${owner}" target="blank">${owner}</a>
        </span>
    </h3>
    `;
    startDateElement = `
      <h2>Start Date</h2>
      <span class="auctionStartDate">${dateString}</span>
    `;
    timeLeftElement = `
    <h3 class="timeLeft">${auctionStatus}</h3>
    `;
  }

  return `
      <div class="prod-card">
      <div class="lt auctionImage"><img alt="bid-item-image" src="${imgUrl}" /></div>
      <div class="rt">
        <div class="left">
            <h1 class="auctionName" id="bid-item-${id}-name">${auctionName}</h1>
            <h2 class="auctionType" id="bid-item-${id}-type">${auctionType}</h2>
            ${ownerElement}
            <div class="paragrph auctionDescription" id="bid-item-${id}-desc">
              <p>${auctionDescription}</p>
            </div>
        </div>
        <div class="right">
            <div class="priceReserv">
              <div class="tp">
                  <div class="lt">
                    <h2> Reserve Price</h2>
                    <span class="auctionReservePrice">${reservePrice} XTZ</span>
                  </div>
                  <div class="rt">
                    ${maxBidElement}
                  </div>
              </div>
              <p>
                  Min. Increment : <span class="auctionIncrement">${minIncrease} XTZ</span>
              </p>
              <div class="tp dateBox">
                  <div class="lt">
                    ${startDateElement}
                  </div>
                  <div class="rt">
                    ${roundDurationElement}
                  </div>
              </div>
              ${timeLeftElement}
              ${button}
            </div>
        </div>
      </div>
    `;
}

export function getDutchAuctionTemplate(
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
  buyer,
  seller,
  userPubKey,
  contractAddress,
  id
) {
  let button = "",
    currPriceElement = "",
    ownerElement = "",
    roundDurationElement = "",
    startDateElement = "",
    timeLeftElement = "";

  const currPrice = new BigNumber(auctionParams.currentPrice)
    .div(1e6)
    .toFixed(6);
  const reservePrice = new BigNumber(auctionParams.reservePrice)
    .div(1e6)
    .toFixed(6);
  if (auctionStatus == "upcoming") {
    if (userPubKey == seller) {
      button = `
      <div class="btnBox">
          <ul>
            <li>
              <a onclick="startAuction('${contractAddress}')">Start</a>
            </li>
          </ul>
      </div>
      `;
    } else if (userPubKey != seller && userPubKey != buyer) {
      button = `
      <div class="btnBox">
          <ul>
            <li>
              <a onclick="shortlistAuction('${contractAddress}')">Shortlist</a>
            </li>
          </ul>
      </div>
      `;
    }

    ownerElement = `
      <h3>
          Owner:
          <span class="owner">
              <a class="carthagelink" href="https://carthage.tzkt.io/${owner}" target="blank">${owner}</a>
          </span>
      </h3>
      `;

    timeLeft += " left";

    startDateElement = `
        <h2>Start Date </h2>
        <span class="auctionStartDate">${dateString}</span>
      `;
    roundDurationElement = `
          <h2>Round Duration</h2>
          <span class="auctionDuration">${auctionDuration}</span>
      `;
    timeLeftElement = `
    <h3 class="timeLeft">${timeLeft}</h3>
    `;
  } else if (auctionStatus == "ongoing") {
    if (userPubKey == seller) {
      button = `
      <div class="btnBox">
          <ul>
            <li>
              <a class="auctioBid" onclick="dropPrice('${contractAddress}')">Drop Price</a>
            </li>
          </ul>
      </div>
      `;
    } else if (userPubKey != seller && userPubKey != buyer) {
      button = `
      <div class="btnBox">
          <ul>
            <li>
              <a class="auctioBid" onclick="acceptPrice('${contractAddress}', '${id}')">Accept Price</a>
            </li>
          </ul>
      </div>
      `;
    }

    currPriceElement = `
      <h2>
          Current Price <span class="auctionReservePrice" id="bid-item-${id}-price">${currPrice} XTZ</span>
      </h2>
      `;
    ownerElement = `
      <h3>
          Owner:
          <span class="owner">
              <a class="carthagelink" href="https://carthage.tzkt.io/${owner}" target="blank">${owner}</a>
          </span>
      </h3>
      `;

    timeLeft = "Ongoing";

    startDateElement = `
    <h2>Start Date</h2>
    <span class="auctionStartDate">${dateString}</span>
  `;
    roundDurationElement = `
          <h2>Round Ends In</h2>
          <span class="auctionDuration">${auctionDuration}</span>
      `;
    timeLeftElement = `
    <h3 class="timeLeft">${timeLeft}</h3>
    `;
  } else {
    if (userPubKey == buyer) {
      button = `
      <div class="btnBox">
          <ul>
            <li>
            <a onclick="reconfigureAuction('${contractAddress}', '${id}')">Auction</a>
            </li>
          </ul>
      </div>
      `;
    }

    currPriceElement = `
        <h2>
            Winning Price <span class="auctionReservePrice" id="bid-item-${id}-price">${currPrice} XTZ</span>
        </h2>
        `;
    ownerElement = `
      <h3>
          Winner:
          <span class="owner">
              <a class="carthagelink" href="https://carthage.tzkt.io/${owner}" target="blank">${owner}</a>
          </span>
      </h3>
      `;
    startDateElement = `
      <span>Start Date</span>
      <span class="auctionStartDate">${dateString}</span>
    `;
    timeLeftElement = `
    <h3 class="timeLeft">${auctionStatus}</h3>
    `;
  }
  return `
      <div class="prod-card">
      <div class="lt auctionImage"><img alt="bid-item-image" src="${imgUrl}" /></div>
      <div class="rt">
        <div class="left">
            <h1 class="auctionName" id="bid-item-${id}-name">${auctionName}</h1>
            <h2 class="auctionType" id="bid-item-${id}-type">${auctionType}</h2>
            ${ownerElement}
            <div class="paragrph auctionDescription" id="bid-item-${id}-desc">
              <p>${auctionDescription}</p>
            </div>
        </div>
        <div class="right">
            <div class="priceReserv">
              <div class="tp">
                  <div class="lt">
                    <h2> Reserve Price</h2>
                    <span class="auctionReservePrice">${reservePrice} XTZ</span>
                  </div>
                  <div class="rt">
                    ${currPriceElement}
                  </div>
              </div>
              <p>
                Current Price : <span class="auctionIncrement">${currPrice} XTZ</span>
              </p>
              <div class="tp dateBox">
                  <div class="lt">
                    ${startDateElement}
                  </div>
                  <div class="rt">
                    ${roundDurationElement}
                  </div>
              </div>
              ${timeLeftElement}
              ${button}
            </div>
        </div>
      </div>
    `;
}
