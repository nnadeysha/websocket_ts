import http from 'http';
import websocket from 'websocket';

const port = 3000;

interface IServerResponseMessage {
  type: string;
  content: string;
}

interface IServerRequestMessage {
  type: string;
  content: string;
}

const requestHandler: http.RequestListener = (request, response) => {
  console.log(request.url);
  response.end('Hello Node.js Server!');
};

const server = http.createServer(requestHandler);

server.listen(port, () => {
  console.log(`server is listening on ${port}`);
});

const wsServer = new websocket.server({
  httpServer: server,
});

let clients: Array<websocket.connection> = [];

wsServer.on('request', function (request) {
  const connection = request.accept(undefined, request.origin);
  clients.push(connection);
  console.log('work');

  clients.forEach((client) => {
    const responseMessage: IServerResponseMessage = {
      type: 'userList',
      content: JSON.stringify(
        clients.map((_, index) => ({ userName: index.toString() }))
      ),
    };
    client.sendUTF(JSON.stringify(responseMessage));
  });

  connection.on('message', function (_message) {
    if (_message.type === 'utf8') {
      const message = _message as websocket.IUtf8Message;

      console.log('Received Message:', message.utf8Data);

      const requestMessage: IServerRequestMessage = JSON.parse(
        message.utf8Data
      );

      if (requestMessage.type === 'message') {
        const responseStatus: IServerResponseMessage = {
          type: 'message-status',
          content: 'ok',
        };

        const responseMessage: IServerResponseMessage = {
          type: 'message',
          content: requestMessage.content,
        };

        connection.sendUTF(JSON.stringify(responseStatus));

        clients.forEach((client) => {
          client.sendUTF(JSON.stringify(responseMessage));
        });
      }

      if (requestMessage.type === 'userList') {
        const responseMessage: IServerResponseMessage = {
          type: 'userList',
          content: JSON.stringify(
            clients.map((_, index) => ({ userName: index.toString() }))
          ),
        };
        connection.sendUTF(JSON.stringify(responseMessage));
      }
    } else {
      throw new Error('Not utf8');
    }
  });

  connection.on('close', function (reasonCode, description) {
    clients = clients.filter((client) => client !== connection);

    clients.forEach((client) => {
      const responseMessage: IServerResponseMessage = {
        type: 'userList',
        content: JSON.stringify(
          clients.map((_, index) => ({ userName: index.toString() }))
        ),
      };
      client.sendUTF(JSON.stringify(responseMessage));
    });

    console.log('Client has disconnected.');
  });
});
