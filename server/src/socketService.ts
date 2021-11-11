import {
  IAttackParams,
  IAuthorisedUser,
  IDefendParams,
  IGameStatus,
  IServerRequestMessage,
  IServerResponseMessage,
  IUser,
} from './socketServerInterface';
import websocket from 'websocket';
import { Durak } from './durak';
import http from 'http';

export class SocketService {
  private clients: Array<websocket.connection> = [];
  private authorisedUsers: Array<IAuthorisedUser> = [];
  game: Durak;

  constructor(server: http.Server) {
    const wsServer = new websocket.server({
      httpServer: server,
    });
    this.game = new Durak();

    wsServer.on('request', (request) => {
      const connection = request.accept(undefined, request.origin);
      //this.clients.push(connection);
      console.log('work');

      connection.on('message', (_message) => {
        if (_message.type === 'utf8') {
          const message = _message as websocket.IUtf8Message;

          console.log('Received Message:', message.utf8Data);

          const requestMessage: IServerRequestMessage = JSON.parse(
            message.utf8Data
          );

          if (requestMessage.type === 'message') {
            this.sendMessageStatus(connection);
            this.clients.forEach((client) => {
              this.sendMessage(client, requestMessage.content);
            });
          }

          if (requestMessage.type === 'userList') {
            this.sendUsers(connection);
          }

          if (requestMessage.type === 'auth') {
            this.clients.push(connection);
            const userData: IUser = JSON.parse(requestMessage.content);
            const authorisedUser: IAuthorisedUser = { connection, userData };
            this.authorisedUsers.push(authorisedUser);
            this.clients.forEach((client) => {
              this.sendUsers(client);
            });
            this.sendAuth(connection, userData);
          }
          if (requestMessage.type === 'join') {
            const joined = this.authorisedUsers.find((authorised) => {
              return authorised.connection === connection;
            });

            if (joined) {
              this.sendJoin(joined.connection);
              this.game.joinUser(joined.userData);
            }

            if (this.game.getPlayers() > 1) {
              this.game.startGame();
              this.game.onFinish = () => {
                this.authorisedUsers.forEach((user) =>
                  this.sendFinish(user.connection, '')
                );
              };
              this.authorisedUsers.forEach((user) => {
                this.sendGameStatus(user.connection, this.game);
              });
            }
          }
          if (requestMessage.type === 'attack') {
            console.log(requestMessage);
            const authorised = this.authorisedUsers.find((authorised) => {
              return authorised.connection === connection;
            });
            const player = this.game.players.find((player) => {
              return player.userName === authorised.userData.userName;
            });

            const attackParams: IAttackParams = JSON.parse(
              requestMessage.content
            );

            const playerCard = player.cards.find((card) =>
              card.isEqual(attackParams.attackCard)
            );

            this.game.attack(player, playerCard);
            this.authorisedUsers.forEach((user) => {
              this.sendGameStatus(user.connection, this.game);
            });
          }

          if (requestMessage.type === 'defend') {
            console.log('def', requestMessage);
            const authorised = this.authorisedUsers.find((authorised) => {
              return authorised.connection === connection;
            });
            const player = this.game.players.find((player) => {
              return player.userName === authorised.userData.userName;
            });
            const defendParams: IDefendParams = JSON.parse(
              requestMessage.content
            );

            if (defendParams.attackCard == null) return;

            const playerCard = player.cards.find((card) =>
              card.isEqual(defendParams.defendCard)
            );

            const attackCard = this.game.cardsInAction.find((action) =>
              action.attack.isEqual(defendParams.attackCard)
            )?.attack;

            if (attackCard == null) return;

            this.game.defend(player, playerCard, attackCard);
            this.authorisedUsers.forEach((user) => {
              this.sendGameStatus(user.connection, this.game);
            });
          }

          if (requestMessage.type === 'turn') {
            const authorised = this.authorisedUsers.find((authorised) => {
              return authorised.connection === connection;
            });

            this.game.turn(authorised.userData.userName);
            this.authorisedUsers.forEach((user) => {
              this.sendGameStatus(user.connection, this.game);
            });
          }

          if (requestMessage.type === 'epicFail') {
            const authorised = this.authorisedUsers.find((authorised) => {
              return authorised.connection === connection;
            });

            this.game.epicFail(authorised.userData.userName);
            this.authorisedUsers.forEach((user) => {
              this.sendGameStatus(user.connection, this.game);
            });
          }
        } else {
          throw new Error('Not utf8');
        }
      });

      connection.on('close', (reasonCode, description) => {
        this.authorisedUsers = this.authorisedUsers.filter(
          (client) => client.connection !== connection
        );
        this.clients = this.clients.filter((client) => client !== connection);

        this.clients.forEach((client) => {
          this.sendUsers(client);
        });

        console.log('Client has disconnected.');
      });
    });
  }

  sendUsers(client: websocket.connection) {
    const userList = this.authorisedUsers.map((user) => ({
      userName: user.userData.userName,
    }))

    this.sendResponse(client, 'userList', JSON.stringify(userList));
  }

  sendMessageStatus(client: websocket.connection) {
    this.sendResponse(client, 'message-status', 'ok');
  }

  sendMessage(client: websocket.connection, message: string) {
    this.sendResponse(client, 'message', message);
  }

  sendAuth(client: websocket.connection, user: IUser) {

    this.sendResponse(client, 'auth', JSON.stringify(user));
  }

  sendGameStatus(client: websocket.connection, game: Durak) {
    const authorisedUser = this.authorisedUsers.find((authorised) => {
      return authorised.connection === client;
    });
    if (!authorisedUser) return;
    const player = game.players.find((player) => {
      return player.userName === authorisedUser.userData.userName;
    });
    if (!player) return;

    const gameStatus: IGameStatus = {
      players: game.players.map((player) => {
        return {
          user: player.userName,
          cardsCount: player.cards.length,
        };
      }),
      cardsCountInStack: game.cards.length,
      trumpCard: game.trumpCard,
      playerCards: player.cards,
      actionCards: game.cardsInAction.map((action) => {
        return {
          attack: action.attack,
          defend: action.defend,
        };
      }),
      currentPlayerIndex: game.currentPlayerIndex,
    };

    this.sendResponse(client, 'game', JSON.stringify(gameStatus));
  }

  sendFinish(client: websocket.connection, message: string) {
    this.sendResponse(client, 'finish', message);
  }

  sendJoin(client: websocket.connection) {
    this.sendResponse(client, 'join', '');
  }

  sendResponse(client: websocket.connection, type: string, stringContenrt: string) {
    const responseMessage: IServerResponseMessage = {
      type: type,
      content: stringContenrt,
    };
    client.sendUTF(JSON.stringify(responseMessage));
  }
}
