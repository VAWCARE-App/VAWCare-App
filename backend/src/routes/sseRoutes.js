const express = require('express');
const router = express.Router();
const { addClient } = require('../utils/sse'); // adjust path to your utils folder

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  addClient(res);

  // optional: send a ping every 30s to keep connection alive
  const ping = setInterval(() => res.write(`:\n\n`), 30000);

  req.on('close', () => clearInterval(ping));
});

module.exports = router;
