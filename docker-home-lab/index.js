const http = require('http');
const PORT = 3000;

http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  res.end('Hello from Docker!');
}).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});