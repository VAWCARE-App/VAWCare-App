// sse.js
const clients = [];

/**
 * Add a new SSE client (response object) to the list
 * @param {Response} res - Express response object
 */
function addClient(res) {
  clients.push(res);

  // Remove the client when the connection closes
  reqCloseListener(res);
}

/**
 * Send an event to all connected clients
 * @param {Object} message - { type: string, data: any }
 */
function broadcast(message) {
  const payload = `event: ${message.type}\ndata: ${JSON.stringify(message.data)}\n\n`;
  clients.forEach(res => res.write(payload));
}

/**
 * Handle client disconnects
 */
function reqCloseListener(res) {
  res.on('close', () => {
    const index = clients.indexOf(res);
    if (index !== -1) clients.splice(index, 1);
  });
}

module.exports = { addClient, broadcast };
