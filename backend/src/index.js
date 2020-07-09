const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const fileType = require('file-type');

const app = express();

var corsOptions = {
  origin: '*',
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

const db = require('./models');
db.sequelize.sync();

const main = require('./services/main');

app.post('/shortlist-auction', (req, res) => {});

// File upload
const { imageFilter } = require('./services/multer.js');

const UPLOAD_PATH = 'images/';

// Only 1 file of max. 10 Mb(approx.) allowed
const upload = multer({
  dest: UPLOAD_PATH,
  limits: { fileSize: 10000000, files: 1 },
  fileFilter: imageFilter,
}).single('image');

app.post('/update-auction-details', async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    const contractAddress = req.body.contractAddress;
    if (!contractAddress) {
      return res.status(400).send('Missing parameter contract address');
    }

    const assetDescription = req.body.description;
    if (!assetDescription) {
      return res.status(400).send('Missing parameter asset description');
    }

    if (!req.file) {
      return res.status(400).send('Please upload a file');
    }

    const assetImageFileName = `/${UPLOAD_PATH}${req.file.filename}`;

    await db.assetDetails.create({
      contractAddress,
      assetDescription,
      assetImageFileName,
    });
    return res
      .status(200)
      .json({ message: 'Image Uploaded Successfully !', path: assetImageFileName });
  });
});

app.post('shortlist', async (req, res) => {
  
});

app.get('/images/:imagename', (req, res) => {
  let imagename = req.params.imagename;
  let imagepath = __dirname.slice(0, -4) + '/' + UPLOAD_PATH + imagename;
  let image = fs.readFileSync(imagepath);
  let mime = fileType(image).mime;

  res.writeHead(200, { 'Content-Type': mime });
  res.end(image, 'binary');
});

app.get('/auctions', async (req, res) => {
  if (!Object.keys(req.query).length) {
    // send all auctions
    const resp = await main.getAuctions();
    return res.status(200).send(resp);
  } else if (Object.keys(req.query).length === 1 && req.query.user_pub_key) {
    // send auctions for user_pub_key
    const resp = await main.getAuctions(req.query.user_pub_key);
    return res.status(200).send(resp);
  } else {
    // send all auctions or error ?
    return res.status(400).send();
  }
});

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}.`);
});

const Cron = require('./Cronjob');
Cron.pollAuctionContractCronJob();
Cron.pollInstaceContractsCronJob();
