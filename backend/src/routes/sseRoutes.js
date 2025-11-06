const express = require('express');
const router = express.Router();
const { addClient } = require('../utils/sse'); // adjust path to your utils folder

router.get('/stream', (req, res) => {
  // Set SSE headers including CORS explicitly
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:5173', // match frontend
    'Access-Control-Allow-Credentials': 'true'
  });
  res.write('\n'); // initial ping

  addClient(res);

  // Keep connection alive
  const ping = setInterval(() => res.write(`:\n\n`), 30000);

  req.on('close', () => clearInterval(ping));
});

module.exports = router;

module.exports = router;
