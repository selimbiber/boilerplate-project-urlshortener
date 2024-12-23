require("dotenv").config();
const express = require("express");
const cors = require("cors");
const urlparser = require("url");
const { MongoClient } = require("mongodb");
const dns = require("dns");

const app = express();
const port = process.env.PORT || 3000;
const cdb = new MongoClient(process.env.URI);
const db = cdb.db("url_service");
const storeUrls = db.collection("urls");

app.use(cors());
app.use("/public", express.static(`${process.cwd()}/public`));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/views/index.html");
});

// URL geçerliliğini kontrol etmek için basit bir regex
const isValidUrl = (url) => {
  const regex = /^(http|https):\/\/[^\s/$.?#].[^\s]*$/;
  return regex.test(url);
};

// first API Endpoint
app.post("/api/shorturl", async (req, res) => {
  const urlString = req.body.url;

  // URL validation
  if (!isValidUrl(urlString)) {
    return res.status(400).json({ error: "invalid url" });
  }

  const hostname = urlparser.parse(urlString).hostname;

  dns.lookup(hostname, async (err, validAddress) => {
    if (err || !validAddress) {
      return res.status(400).json({ error: "invalid url" });
    }

    try {
      const countUrls = await storeUrls.countDocuments({});
      const urlStore = {
        urlString,
        short_url: countUrls,
      };
      await storeUrls.insertOne(urlStore);
      res.json({
        original_url: urlString,
        short_url: countUrls,
      });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
});

app.get("/api/shorturl/:short_url", async (req, res) => {
  const shorturl = req.params.short_url;

  try {
    const urlStore = await storeUrls.findOne({ short_url: +shorturl });
    if (!urlStore) {
      return res.status(404).json({ error: "Short URL not found" });
    }
    res.redirect(urlStore.urlString);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
