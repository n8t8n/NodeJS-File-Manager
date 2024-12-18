const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const appRoot = __dirname;
const pm2 = require('pm2');
let runningServers = [];

// File List Route
router.get("/", (req, res) => {
  console.log("Fetching file list...");
  const currentDir = path.resolve(appRoot, req.query.dir || ".");
  console.log(`Current Directory: ${currentDir}`);
  fs.readdir(currentDir, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return res
        .status(500)
        .send({ message: "Error reading directory", error: err.message });
    }

    console.log("Generating file list...");
    const fileList = files.map((file) => ({
      name: file.name,
      path: path.relative(appRoot, path.join(currentDir, file.name)),
      type: file.isDirectory() ? "folder" : "file",
    }));
    const backLink =
      currentDir !== appRoot
        ? path.relative(appRoot, path.dirname(currentDir))
        : null;

    console.log("Rendering file list...");
    res.render("index", {
      fileList,
      currentDir: path.relative(appRoot, currentDir),
      backLink,
      path,
    });
  });
});

// File Upload Route (GET)
router.get("/upload", (req, res) => {
  console.log("Rendering upload form...");
  const currentDir = path.resolve(appRoot, req.query.dir || ".");
  console.log(`Current Directory for Upload: ${currentDir}`);
  res.render("upload", { currentDir });
});

// File Upload Route (POST)
router.post("/upload", (req, res) => {
  console.log("Handling file upload...");
  if (!req.file) {
    console.log("No file uploaded.");
    return res.send("No file uploaded");
  }

  console.log("Moving uploaded file...");
  const uploadPath = path.join(req.body.dir, req.file.filename);
  console.log(`Upload Path: ${uploadPath}`);
  fs.rename(req.file.path, uploadPath, (err) => {
    if (err) {
      console.error("Error moving uploaded file:", err);
      return res
        .status(500)
        .send({ message: "Error moving uploaded file", error: err.message });
    }
    console.log(`File uploaded to: ${uploadPath}`);
    res.redirect(`/?dir=${encodeURIComponent(req.body.dir)}`);
  });
});

router.get("/files/:filePath", (req, res) => {
  console.log("Fetching file for download/render...");
  const filePath = path.resolve(appRoot, req.params.filePath);
  console.log(`File Path: ${filePath}`);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error("File not found:", err);
      return res.status(404).send({ message: "File not found" });
    }
    console.log("Sending file...");
    res.sendFile(filePath, { root: appRoot });
  });
});

// Create Folder Route
router.get("/create-folder", (req, res) => {
  console.log("Rendering create folder form...");
  const currentDir = path.resolve(appRoot, req.query.dir || ".");
  console.log(`Current Directory for Folder Creation: ${currentDir}`);
  res.render("create-folder", { currentDir });
});

router.post("/save-folder", (req, res) => {
  console.log("Creating new folder...");
  const newFolderPath = path.resolve(
    appRoot,
    req.body.dir,
    req.body.folderName
  );
  console.log(`New Folder Path: ${newFolderPath}`);
  fs.mkdir(newFolderPath, { mode: 0o775 }, (err) => {
    if (err) {
      console.error("Error creating folder:", err);
      return res
        .status(500)
        .send({ message: "Error creating folder", error: err.message });
    }
    console.log("Folder created successfully.");
    res.redirect(`/?dir=${encodeURIComponent(req.body.dir)}`);
  });
});

// Create File Route
router.get("/create-file", (req, res) => {
  console.log("Rendering create file form...");
  const currentDir = path.resolve(appRoot, req.query.dir || ".");
  console.log(`Current Directory for File Creation: ${currentDir}`);
  res.render("create-file", { currentDir });
});

router.post("/save-file", (req, res) => {
  console.log("Creating new file...");
  const newFilePath = path.resolve(appRoot, req.body.dir, req.body.fileName);
  console.log(`New File Path: ${newFilePath}`);
  fs.writeFile(newFilePath, "", { mode: 0o775, encoding: "utf-8" }, (err) => {
    if (err) {
      console.error("Error creating file:", err);
      return res
        .status(500)
        .send({ message: "Error creating file", error: err.message });
    }
    console.log("File created successfully.");
    res.redirect(`/?dir=${encodeURIComponent(req.body.dir)}`);
  });
});

// Edit File Route
router.get("/edit", (req, res) => {
  console.log("Fetching file for editing...");
  const filePath = path.resolve(appRoot, req.query.file);
  console.log(`File Path for Editing: ${filePath}`);
  const editableExtensions = [
    ".txt",
    ".js",
    ".css",
    ".html",
    ".json",
    ".yml",
    ".env",
    ".php",
    ".go",
    ".csv",
    ".ejs",
    ".vue",
    ".scss",
    ".sass",
    ".less",
    ".ts",
    ".jsx",
    ".tsx",
  ];

  const ext = path.extname(filePath).toLowerCase();

  if (editableExtensions.includes(ext)) {
    console.log("Reading file for editing...");
    fs.readFile(filePath, "utf-8", (err, data) => {
      if (err) {
        console.error("Error reading file for editing:", err);
        return res
          .status(500)
          .send({ message: "Error reading file", error: err.message });
      }
      console.log("Rendering edit form...");
      res.render("edit", {
        filePath,
        fileName: path.basename(filePath),
        type: "text",
        data,
      });
    });
  } else {
    console.log("Downloading file...");
    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        return res
          .status(500)
          .send({ message: "Error downloading file", error: err.message });
      }
      console.log("File downloaded successfully.");
    });
  }
});

router.get("/download/:fileName", (req, res) => {
  const filePath = path.resolve(appRoot, req.query.path);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error("File not found:", err);
      return res.status(404).send({ message: "File not found" });
    }
    res.download(filePath, req.params.fileName, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        return res.status(500).send({ message: "Error downloading file" });
      }
    });
  });
});

// Save Edited File
router.post("/save-edit", (req, res) => {
  console.log("Saving edited file...");
  const { content, filePath } = req.body;
  const absoluteFilePath = path.resolve(appRoot, filePath);
  console.log(`Absolute File Path for Saving: ${absoluteFilePath}`);
  fs.writeFile(absoluteFilePath, content, { encoding: "utf8" }, (err) => {
    if (err) {
      console.error("Error saving file:", err);
      return res
        .status(500)
        .send({ message: "Error saving file", error: err.message });
    }
    console.log("File saved successfully.");
    res.redirect(`/?dir=${encodeURIComponent(path.dirname(absoluteFilePath))}`);
  });
});

// Delete File
router.get("/delete-file", (req, res) => {
  console.log("Rendering delete file form...");
  const file = path.resolve(appRoot, req.query.file);
  console.log(`File Path for Deletion: ${file}`);
  res.render("delete-file", { file });
});

router.post("/delete-file-confirm", (req, res) => {
  console.log("Deleting file...");
  const filePath = path.resolve(appRoot, req.body.filePath);
  console.log(`File Path for Deletion Confirmation: ${filePath}`);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file:", err);
      return res
        .status(500)
        .send({ message: "Error deleting file", error: err.message });
    }
    console.log("File deleted successfully.");
    res.redirect(`/?dir=${encodeURIComponent(path.dirname(filePath))}`);
  });
});

// Delete Folder
router.get("/delete-folder", (req, res) => {
  console.log("Rendering delete folder form...");
  const folderPath = path.resolve(appRoot, req.query.dir, req.query.folder);
  console.log(`Folder Path for Deletion: ${folderPath}`);
  res.render("delete-folder", { folderName: req.query.folder, folderPath });
});

router.post("/delete-folder-confirm", (req, res) => {
  console.log("Deleting folder...");
  const folderPath = path.resolve(appRoot, req.body.folderPath);
  console.log(`Folder Path for Deletion Confirmation: ${folderPath}`);
  fs.rm(folderPath, { recursive: true, force: true }, (err) => {
    if (err) {
      console.error("Error deleting folder:", err);
      return res
        .status(500)
        .send({ message: "Error deleting folder", error: err.message });
    }
    console.log("Folder deleted successfully.");
    res.redirect(`/?dir=${encodeURIComponent(path.dirname(folderPath))}`);
  });
});

// Move File
router.get("/move-file", (req, res) => {
  console.log("Rendering move file form...");
  const file = path.resolve(appRoot, req.query.file);
  console.log(`File Path for Moving: ${file}`);
  const currentDir = path.resolve(appRoot, req.query.currentDir || ".");
  console.log(`Current Directory for File Move: ${currentDir}`);

  fs.readdir(appRoot, { withFileTypes: true }, (err, rootFiles) => {
    if (err) {
      console.error("Error reading root directory for move:", err);
      return res
        .status(500)
        .send({ message: "Error reading root directory", error: err.message });
    }

    console.log("Generating list of folders for move...");
    const rootFolders = rootFiles
      .filter((f) => f.isDirectory())
      .map((f) => f.name);
    fs.readdir(currentDir, { withFileTypes: true }, (err, files) => {
      if (err) {
        console.error("Error reading directory for move:", err);
        return res
          .status(500)
          .send({ message: "Error reading directory", error: err.message });
      }

      console.log("Combining folder lists for move...");
      const folders = files.filter((f) => f.isDirectory()).map((f) => f.name);
      const allFolders = [...new Set([...rootFolders, ...folders, "."])];

      console.log("Rendering move file form with folder list...");
      res.render("move-file", {
        file: path.relative(appRoot, file),
        folders: allFolders,
        currentDir: path.relative(appRoot, currentDir),
      });
    });
  });
});

router.post("/move-file", (req, res) => {
  console.log("Moving file...");
  const sourcePath = path.resolve(appRoot, req.body.file);
  console.log(`Source Path: ${sourcePath}`);
  const destinationDir = path.resolve(appRoot, req.body.destinationDir);
  console.log(`Destination Directory: ${destinationDir}`);
  const destinationPath = path.join(destinationDir, path.basename(sourcePath));
  console.log(`Destination Path: ${destinationPath}`);

  if (fs.existsSync(destinationPath)) {
    console.log("Deleting existing file at destination...");
    fs.unlinkSync(destinationPath);
  }

  fs.rename(sourcePath, destinationPath, (err) => {
    if (err) {
      console.error("Error moving file:", err);
      return res
        .status(500)
        .send({ message: "Error moving file", error: err.message });
    }
    console.log("File moved successfully.");
    res.redirect(`/?dir=${encodeURIComponent(destinationDir)}`);
  });
});

router.post("/rename-file", (req, res) => {
  console.log("Renaming file...");

  // Trim whitespace from filePath and newFileName
  const filePath = path.resolve(appRoot, req.body.filePath.trim());
  console.log(`Original File Path: ${filePath}`);
  const newFileName = req.body.newFileName.trim();
  console.log(`New File Name: ${newFileName}`);
  const dirPath = path.dirname(filePath);
  console.log(`Directory Path: ${dirPath}`);
  const newFilePath = path.join(dirPath, newFileName);
  console.log(`New File Path: ${newFilePath}`);

  // Check if the file name is empty
  if (!newFileName) {
    console.error("New file name is required.");
    return res.status(400).send({
      message: "New file name is required",
      error: "New file name is required",
    });
  }

  // Check if the original file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error("Original file not found:", err);
      return res
        .status(404)
        .send({ message: "Original file not found", error: err.message });
    }

    // Check if the new file name is the same as the original
    if (newFilePath === filePath) {
      console.log(
        `Info: New file name is the same as the original - ${filePath}`
      );
      return res.redirect(`/?dir=${encodeURIComponent(dirPath)}`);
    }

    // Check if a file with the new name already exists
    fs.access(newFilePath, fs.constants.F_OK, (err) => {
      if (!err) {
        console.error("File with new name already exists.");
        return res.status(409).send({
          message: "File with new name already exists",
          error: "File already exists",
        });
      }

      // Rename the file
      fs.rename(filePath, newFilePath, (err) => {
        if (err) {
          console.error("Error renaming file:", err);
          return res
            .status(500)
            .send({ message: "Error renaming file", error: err.message });
        }
        console.log(`Success: File renamed - ${filePath} -> ${newFilePath}`);
        res.redirect(`/?dir=${encodeURIComponent(dirPath)}`);
      });
    });
  });
});

// Rename Folder Route (GET)
router.get("/rename-folder", (req, res) => {
  console.log("Rendering rename folder form...");
  const folderPath = path.resolve(appRoot, req.query.dir, req.query.folder);
  console.log(`Folder Path for Renaming: ${folderPath}`);
  res.render("rename-folder", {
    folderPath,
    folderName: req.query.folder,
    currentDir: req.query.dir,
  });
});

// Rename Folder Route (POST)
router.post("/rename-folder", (req, res) => {
  console.log("Renaming folder...");

  // Trim whitespace from folderPath and newFolderName
  const folderPath = path.resolve(appRoot, req.body.folderPath.trim());
  console.log(`Original Folder Path: ${folderPath}`);
  const newFolderName = req.body.newFolderName.trim();
  console.log(`New Folder Name: ${newFolderName}`);
  const dirPath = path.dirname(folderPath);
  console.log(`Directory Path: ${dirPath}`);
  const newFolderPath = path.join(dirPath, newFolderName);
  console.log(`New Folder Path: ${newFolderPath}`);

  // Check if the folder name is empty
  if (!newFolderName) {
    console.error("New folder name is required.");
    return res.status(400).send({
      message: "New folder name is required",
      error: "New folder name is required",
    });
  }

  // Check if the original folder exists
  fs.access(folderPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error("Original folder not found:", err);
      return res
        .status(404)
        .send({ message: "Original folder not found", error: err.message });
    }

    // Check if the new folder name is the same as the original
    if (newFolderPath === folderPath) {
      console.log(
        `Info: New folder name is the same as the original - ${folderPath}`
      );
      return res.redirect(`/?dir=${encodeURIComponent(dirPath)}`);
    }

    // Check if a folder with the new name already exists
    fs.access(newFolderPath, fs.constants.F_OK, (err) => {
      if (!err) {
        console.error("Folder with new name already exists.");
        return res.status(409).send({
          message: "Folder with new name already exists",
          error: "Folder already exists",
        });
      }

      // Rename the folder
      fs.rename(folderPath, newFolderPath, (err) => {
        if (err) {
          console.error("Error renaming folder:", err);
          return res
            .status(500)
            .send({ message: "Error renaming folder", error: err.message });
        }
        console.log(
          `Success: Folder renamed - ${folderPath} -> ${newFolderPath}`
        );
        res.redirect(`/?dir=${encodeURIComponent(dirPath)}`);
      });
    });
  });
});

// Manage Servers with PM2

router.post("/start-server", (req, res) => {
  const serverScript = req.body.serverScript;
  const serverPath = path.join(appRoot, serverScript);

  pm2.start({
    script: serverPath,
    name: `server-${serverScript}`,
    watch: true,
    env: {
      NODE_ENV: 'development'
    }
  }, (err, apps) => {
    if (err) {
      console.error("Error starting server with PM2:", err);
      return res.status(500).send({ message: "Error starting server", error: err.message });
    }
    console.log(`Server started successfully with PM2: ${serverScript}`);
    res.redirect("/servers-running");
  });
});

router.post("/stop-server", (req, res) => {
  pm2.list((err, processes) => {
    if (err) {
      console.error("Error fetching running servers with PM2:", err);
      return res.status(500).send({ message: "Error fetching running servers", error: err.message });
    }
    const runningServers = processes.map((process) => ({
      name: process.name,
      pid: process.pid,
      status: process.pm2_env.status,
      logs: process.pm2_env.pm_out_log_path
    }));

    const index = parseInt(req.body.index, 10);

    if (isNaN(index) || index < 0 || index >= runningServers.length) {
      console.error("Invalid server index.");
      return res.send("Invalid server index");
    }

    const serverName = runningServers[index].name;
    pm2.delete(serverName, (err) => {
      if (err) {
        console.error("Error stopping server with PM2:", err);
        return res.status(500).send({ message: "Error stopping server", error: err.message });
      }
      console.log(`Server stopped successfully with PM2: ${serverName}`);
      res.redirect("/servers-running");
    });
  });
});

router.get("/servers-running", (req, res) => {
  pm2.list((err, processes) => {
    if (err) {
      console.error("Error fetching running servers with PM2:", err);
      return res.status(500).send({ message: "Error fetching running servers", error: err.message });
    }
    const runningServers = processes.map((process) => ({
      name: process.name,
      pid: process.pid,
      status: process.pm2_env.status,
      logs: process.pm2_env.pm_out_log_path,
      path: process.pm2_env.pm_cwd, // Use the correct property name (pm2_env.pm_cwd)
      pm2View: JSON.stringify(process, null, 2)
    }));
    res.render("servers-running", { runningServers });
  });
});

module.exports = router;
