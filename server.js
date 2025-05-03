const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bodyParser = require("body-parser");
const os = require("os"); // For getting network interfaces

// Initialize Express app
const app = express();
const PORT = 3000;

// Get the server's IP address (for Chromecast to access)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1"; // Default to localhost if no external IP is found
}

const LOCAL_IP = getLocalIP();
console.log(`Server IP address: ${LOCAL_IP}`);

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static("public"));

// Create media directory if it doesn't exist
const mediaDir = path.join(__dirname, "media");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
  console.log("Created media directory");
}

// Get MIME type based on file extension
function getMimeType(filename) {
  const extension = path.extname(filename).toLowerCase().substring(1);
  const mimeTypes = {
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    m4v: "video/mp4",
    "3gp": "video/3gpp",
  };

  return mimeTypes[extension] || "application/octet-stream";
}

// Custom media serving route with proper content-type headers
app.get("/media/:filename", (req, res) => {
  const filePath = path.join(mediaDir, req.params.filename);

  fs.stat(filePath, (err, stats) => {
    if (err) return res.sendStatus(404);

    let { range } = req.headers;
    if (!range) range = "bytes=0-"; // default = whole file

    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);

    // Calculate a larger chunk size for better buffering
    // This helps prevent the 1-2 second playback followed by buffering issue
    const BUFFER_SIZE = 1024 * 1024 * 2; // 2MB buffer size

    // If end is not specified, use start + BUFFER_SIZE, but not exceeding file size
    const end = endStr
      ? parseInt(endStr, 10)
      : Math.min(start + BUFFER_SIZE, stats.size - 1);

    if (start >= stats.size) {
      // invalid range
      res.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
      return res.end();
    }

    const chunk = end - start + 1;
    const headers = {
      "Content-Range": `bytes ${start}-${end}/${stats.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunk,
      "Content-Type": getMimeType(filePath),
      // Add cache control headers to improve buffering
      "Cache-Control": "public, max-age=3600",
      // Set higher priority for media files
      "X-Content-Type-Options": "nosniff",
      // Allow browser to determine optimal streaming strategy
      "X-Accel-Buffering": "yes",
    };

    res.writeHead(range ? 206 : 200, headers);

    // Create a read stream with a larger highWaterMark for better performance
    const stream = fs.createReadStream(filePath, {
      start,
      end,
      highWaterMark: 64 * 1024, // 64KB chunks for smoother streaming
    });

    // Handle potential stream errors
    stream.on("error", (streamErr) => {
      console.error(`Stream error for ${filePath}:`, streamErr);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end("Internal Server Error");
      } else {
        res.end();
      }
    });

    // Pipe the stream to the response
    stream.pipe(res);
  });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "media/");
  },
  filename: function (req, file, cb) {
    // Keep the original filename
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// API endpoint to get a list of available media files
app.get("/api/media", (req, res) => {
  fs.readdir(mediaDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve media files" });
    }

    // Filter for video files only
    const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".mkv", ".avi"];
    const videoFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return videoExtensions.includes(ext);
    });

    // Create an array of file objects with more info
    const mediaFiles = videoFiles.map((file) => {
      return {
        name: file,
        url: `http://${LOCAL_IP}:${PORT}/media/${file}`,
        type: getMimeType(file),
      };
    });

    res.json(mediaFiles);
  });
});

// Upload endpoint
app.post("/api/upload", upload.single("videoFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Return the URL to the uploaded file
  const fileUrl = `http://${LOCAL_IP}:${PORT}/media/${req.file.originalname}`;
  res.json({
    success: true,
    file: {
      name: req.file.originalname,
      url: fileUrl,
      type: getMimeType(req.file.originalname),
    },
  });
});

// Debug endpoint to check media file access and info
app.get("/api/check-media/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(mediaDir, filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({
        exists: false,
        message: "File does not exist",
        path: filePath,
      });
    }

    const stats = fs.statSync(filePath);
    res.json({
      exists: true,
      size: stats.size,
      path: filePath,
      url: `http://${LOCAL_IP}:${PORT}/media/${filename}`,
      accessible: true,
      mimeType: getMimeType(filename),
    });
  });
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Media server running at:`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Network: http://${LOCAL_IP}:${PORT}`);
  console.log(
    `Media files are being served from: http://${LOCAL_IP}:${PORT}/media/`,
  );
});
