const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");


const appRoot = __dirname;

// Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("Setting upload directory...");
    const uploadDir = path.resolve(appRoot, req.body.currentDir || ".");
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Upload directory set to: ${uploadDir}`);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    console.log("Generating filename...");
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

module.exports = {
  urlEncodedParser: express.urlencoded({ extended: true }),
  jsonParser: express.json(),
  upload: upload.single("file"),
};
