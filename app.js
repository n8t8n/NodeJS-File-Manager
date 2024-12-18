const express = require("express");
const app = express();
const port = 3000;
const appRoot = __dirname;
const path = require("path");
const fs = require("fs");


// Import required modules and configurations
const config = require("./config");
const routes = require("./routes");
const middleware = require("./middleware");

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", path.join(appRoot, "views"));

// Middleware Setup
app.use(middleware.urlEncodedParser);
app.use(middleware.jsonParser);
app.use(express.static(path.join(appRoot, "public")));

// Multer Setup for File Uploads
app.use("/upload", middleware.upload);

// Mount Routes
app.use("/", routes);

// Start the Server
app.listen(port, () => {
  console.log(`File manager running at http://localhost:${port}`);
});