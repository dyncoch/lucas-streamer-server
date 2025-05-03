# Lucas Streamer Server

A local media server for streaming videos to your Chromecast devices and web browsers. This lightweight Express.js application allows you to easily upload, manage, and stream your personal media collection over your local network.

## Features

- **Easy Media Management**: Upload video files through a simple web interface
- **Chromecast Compatibility**: Stream videos directly to your Chromecast-enabled devices
- **Optimized Video Streaming**: Implements proper range requests and buffering for smooth playback
- **Automatic IP Detection**: Automatically finds your local network IP for easy device connection
- **RESTful API**: Simple API endpoints for media listing, uploading, and checking
- **Cross-Platform**: Works on any device with a modern web browser

## Supported File Formats

The server supports the following video formats:

- MP4 (`.mp4`, `.m4v`)
- WebM (`.webm`)
- Ogg (`.ogg`)
- QuickTime (`.mov`)
- Matroska (`.mkv`)
- AVI (`.avi`)
- 3GPP (`.3gp`)

## Installation

### Prerequisites

- Node.js (v12 or later)
- npm (comes with Node.js)

### Steps

1. Clone this repository:
   ```
   git clone https://github.com/dyncoch/lucas-streamer-server.git
   cd lucas-streamer-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

   For development with automatic reloading:
   ```
   npm test
   ```

## Usage

Once the server is running, you can access it at:

- Local: http://localhost:3000
- Network: http://YOUR_IP:3000 (Your IP address will be displayed in the console)

### API Endpoints

- `GET /api/media` - List all available media files
- `POST /api/upload` - Upload a new video file
- `GET /api/check-media/:filename` - Check if a specific file exists and get its details
- `GET /media/:filename` - Stream a video file

### Uploading Files

You can upload video files using the web interface or by making a POST request to `/api/upload` with a form-data body containing a `videoFile` field.

### Streaming to Chromecast

1. Open the web interface
2. Select a video from the list
3. Click the Chromecast icon in the player
4. Select your Chromecast device

## Project Structure

- `/media` - Directory where uploaded videos are stored
- `/public` - Static web files for the user interface
- `server.js` - Main application file

## License

ISC License - See LICENSE file for details.

## Author

Lucas F. Martins

