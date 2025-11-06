// sse.js
const clients = [];

function addClient(res) {
  // Don't call writeHead here; headers already set in route
  clients.push(res);

  res.write(`: connected\n\n`); // initial comment to open connection

  res.on("close", () => {
    const index = clients.indexOf(res);
    if (index !== -1) clients.splice(index, 1);
  });
}

function broadcast(eventName, notification) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(notification)}\n\n`;

  clients.forEach((res) => {
    if (!res.finished) {
      try {
        res.write(payload);
      } catch (err) {
        console.error("[SSE] Failed to write to client:", err);
      }
    }
  });
}

module.exports = { addClient, broadcast };