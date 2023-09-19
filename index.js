require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const dns = require("dns");
const fs = require("fs");
const path = require("path");
const e = require("express");

const db = path.join(path.dirname(process.mainModule.filename), "urls.json");

const readUrls = (done) => {
  fs.readFile(db, (err, data) => {
    if (err) {
      console.log(err);
      return done(null, []);
    }
    return done(null, JSON.parse(data));
  });
};

const saveUrls = (urls) => {
  console.log(urls);
  fs.writeFile(db, JSON.stringify(urls), (err) => {
    if (err) {
      console.log(err);
    }
  });
};

const formatHostname = (hostname) => {
  let address = null;
  if (hostname.indexOf("s://") !== -1) {
    address = hostname.split("").splice(8);
    return address.join("");
  } else if (hostname.indexOf("p://") !== -1) {
    address = hostname.split("").splice(7);
    return address.join("");
  }
};

app.use(express.json());

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));
app.use(express.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl", function (req, res) {
  try {
    const host = formatHostname(req.body.url);

    console.log(host);

    if(!host) return res.json({ error: "invalid url" });

    let existing = null;

    readUrls((err, data) => {
      if (err) {
        urls = [];
      }
      urls = data;

      data.forEach(function (url) {
        if (url.original_url === host) {
          return (existing = url);
        }
      });
      if (existing) {
        return res.status(203).json(existing);
      }

      dns.lookup(host, function (err, address, family) {
        if (err) {
          console.log(err);
          return res.json({ error: "invalid url" });
        }
        console.log(address);
        console.log(family);
        const short_url = Object.keys(data).length + 1;
        const urlObj = { original_url: host, short_url: short_url };
        data.push(urlObj);
        console.log(data);
        saveUrls(data);
        res.json({ original_url: host, short_url: short_url });
      });
    });
  } catch (ex) {
    console.log(ex);
    res.json({ error: "invalid url" });
  }
});

app.get("/api/shorturl/:shorturl", (req, res, next) => {
  const shorturl = req.params.shorturl;
  let address = null;
  try {
    readUrls((err, data) => {
      if (err) return res.status(400).json({ error: "invalid short_url" });
      data.find((url) => {
        if (url.short_url == shorturl) {
          console.log(url.original_url);
          return (address = url.original_url);
        } else {
          return null;
        }
      });
      if (address) {
        return res.redirect("https://" + address);
      } else {
        res.status(400).json({ error: "invalid short_url" });
      }
    });
  } catch (ex) {
    console.log(ex);
    res.status(500).json({ error: "invalid url" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
