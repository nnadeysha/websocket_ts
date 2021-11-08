import http from 'http';
import { SocketService } from './socketService';

const port = 3000;

const requestHandler: http.RequestListener = (request, response) => {
  console.log(request.url);
  response.end('Hello Node.js Server!');
};

const server = http.createServer(requestHandler);
const socketService = new SocketService(server);

server.listen(port, () => {
  console.log(`server is listening on ${port}`);
});
