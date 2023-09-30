require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const dns = require("dns");
const fs = require("fs");
const path = require("path");

const db = process.cwd() + "/urls.json";

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
  let address = hostname;
  let tail = null;
  if (hostname.indexOf("s://") !== -1) {
    split = hostname.split("").splice(8);
    address = split.join("");
  } else if (hostname.indexOf("p://") !== -1) {
    split = hostname.split("").splice(7);
    address = split.join("");
  }

  const result =
    address.indexOf(".com/") ||
    address.indexOf(".net/") ||
    address.indexOf(".org/");

  if (result !== -1) {
    tail = address
      .split("")
      .splice(result + 5)
      .join("");
    const head = address.split("").splice(0, result + 5);
    address = head.join("");
  }
  return { host: address, tail };
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
    let { host, tail } = formatHostname(req.body.url);

    if (!host) return res.json({ error: "invalid url" });

    let existing = null;

    readUrls((err, data) => {
      if (err) {
        urls = [];
      }
      urls = data;

      data.forEach(function (url) {
        if (
          url.original_url === "https://" + host ||
          url.original_url === "http://" + host
        ) {
          return (existing = {
            original_url: `${url.original_url}${
              url.url_tail ? `${url.url_tail}` : ""
            }`,
            short_url: url.short_url,
          });
        }
      });
      if (existing) {
        return res.status(203).json(existing);
      }

      dns.lookup(host, function (err, address, family) {
        if (err) {
          console.log(err.message);
          return res.json({ error: "invalid url" });
        }
        console.log(address);
        console.log(family);
        const short_url = Object.keys(data).length + 1;
        const urlObj = {
          original_url: "https://" + host.toString(),
          short_url: short_url,
          url_tail: tail !== null && tail,
          created_at: new Date(),
        };
        data.push(urlObj);
        saveUrls(data);
        console.log(host, tail);

        if (tail === null)
          return res.json({
            original_url: urlObj.original_url,
            short_url: urlObj.short_url,
          });
        res.json({
          original_url: `https://${host}${tail ? tail : ""}`,
          short_url: short_url,
        });
      });
    });
  } catch (ex) {
    console.log(ex.message);
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
        return res.redirect(address);
      } else {
        res.status(400).json({ error: "invalid short_url" });
      }
    });
  } catch (ex) {
    console.log(ex.message);
    res.status(500).json({ error: "invalid url" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
