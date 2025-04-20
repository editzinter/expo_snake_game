const express = require('express');
const http = require('http');
const next = require('next');
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

// Now we can import TypeScript files
const { initGameServer, addAIPlayer } = require('./server/game/index');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3002;

// Add some AI players for testing/demonstration
const NUM_AI_PLAYERS = 5;

app.prepare().then(() => {
  const server = express();
  
  // Enable CORS
  server.use(cors());
  
  // Create HTTP server
  const httpServer = http.createServer(server);
  
  // Initialize the game server with the HTTP server
  const io = initGameServer(httpServer);
  
  // Add some AI players if specified
  for (let i = 0; i < NUM_AI_PLAYERS; i++) {
    addAIPlayer();
  }
  
  // Handle Next.js requests
  server.all('*', (req, res) => {
    return handle(req, res);
  });
  
  // Start the server
  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Game server ready on http://localhost:${PORT}`);
  });
}); 