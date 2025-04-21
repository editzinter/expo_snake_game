const express = require('express');
const http = require('http');
const cors = require('cors');
const { join } = require('path');

// Setup for TypeScript files
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
  },
});

// Import game server code
const { initGameServer, addAIPlayer } = require('./server/game/index');

const PORT = process.env.PORT || 3002;
const NUM_AI_PLAYERS = 5;

// Create Express app
const app = express();

// Enable CORS - this is critical for cross-domain communication
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Allow your Netlify frontend URL
  methods: ['GET', 'POST'],
  credentials: true
}));

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize the game server with the HTTP server
const io = initGameServer(httpServer);

// Add some AI players if specified
for (let i = 0; i < NUM_AI_PLAYERS; i++) {
  addAIPlayer();
}

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('Game server is running');
});

// Start the server
httpServer.listen(PORT, (err) => {
  if (err) throw err;
  console.log(`> Game server ready on port ${PORT}`);
}); 