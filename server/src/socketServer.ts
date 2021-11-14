import {connection, IUtf8Message} from "websocket";
import {
  IAttackParams,
  IAuthorisedUser,
  IGameStatus,
  IServerRequestMessage,
  IServerResponseMessage
} from "./socketServerInterface";
import * as http from "http";
import {IDefendParams, IUser} from "../../client/src/interfaces";
import {Durak} from "./cardGame";
import {PlayerController} from "./playerController";
import {BotController} from "./BotController";

const websocket = require('websocket')

export class SocketService {
  game: Durak;
  private clients: Array<connection> = [];
  private authorisedUsers: Array<IAuthorisedUser> = [];

  constructor(server: http.Server) {
    const wsServer = new websocket.server({
      httpServer: server,
    });
    this.game = new Durak();

    wsServer.on('request', (request) => {
      const connection = request.accept(undefined, request.origin);

      connection.on('message', (_message) => {
        if (_message.type === 'utf8') {
          const message = _message as IUtf8Message;
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
            const authorisedUser: IAuthorisedUser = {connection, userData};
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
            const statusHandler = () =>{
              //this.game.getGameStatus('');
              /* this.authorisedUsers.forEach((user) => {
                this.sendGameStatus(user.connection, this.game);
              }); */
              this.sendGameStatus(connection, this.game)
            } 
            if (joined ) {
              this.sendJoin(joined.connection);
              
              this.game.onGameStatus.add(statusHandler)
              //this.game.joinUser(joined.userData);
            }
            if (this.game.getPlayers() >= 0) {
              this.game.joinUser({userName:'Bot'})
              const bot= new BotController(this.game,'Bot');
               this.game.joinUser({userName:'Bot1'})
              const bot1= new BotController(this.game,'Bot1');
              this.game.joinUser({userName:'Bot2'})
              const bot2= new BotController(this.game,'Bot2'); 
              this.game.startGame();
              this.game.onFinish = () => {
                this.game.onGameStatus.remove(statusHandler);
                bot.destroy();
                bot1.destroy();
                bot2.destroy();
                this.authorisedUsers.forEach((user) =>
                  this.sendFinish(user.connection, '')
                );
              };
              this.authorisedUsers.forEach((user) => {
                this.sendGameStatus(user.connection, this.game);
              });
            }
            // if (this.game.getPlayers() > 1) {
            //   this.game.startGame();
            //   this.game.onFinish = () => {
            //     this.authorisedUsers.forEach((user) =>
            //       this.sendFinish(user.connection, '')
            //     );
            //   };
            //   this.authorisedUsers.forEach((user) => {
            //     this.sendGameStatus(user.connection, this.game);
            //   });
            // }
          }
          if (requestMessage.type === 'attack') {
            const authorised = this.authorisedUsers.find((authorised) => {
              return authorised.connection === connection;
            });
            const controller= new PlayerController(this.game,authorised.userData.userName)
            const attackParams: IAttackParams = JSON.parse(
              requestMessage.content
            );
            controller.attack(attackParams.attackCard);
            this.authorisedUsers.forEach((user) => {
              this.sendGameStatus(user.connection, this.game);
            });
            controller.destroy()
          }

          if (requestMessage.type === 'defend') {
            //console.log('def', requestMessage);
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

  sendUsers(client: connection) {
    const userList = this.authorisedUsers.map((user) => ({
      userName: user.userData.userName,
    }))

    this.sendResponse(client, 'userList', JSON.stringify(userList));
  }

  sendMessageStatus(client: connection) {
    this.sendResponse(client, 'message-status', 'ok');
  }

  sendMessage(client: connection, message: string) {
    this.sendResponse(client, 'message', message);
  }

  sendAuth(client: connection, user: IUser) {

    this.sendResponse(client, 'auth', JSON.stringify(user));
  }

  sendGameStatus(client: connection, game: Durak) {
    if(!game.isStarted){
      return;
    }
    const authorisedUser = this.authorisedUsers.find((authorised) => {
      return authorised.connection === client;
    });
    if (!authorisedUser) return;
    const gameStatus = game.getGameStatus(authorisedUser.userData.userName)
    this.sendResponse(client, 'game', JSON.stringify(gameStatus));
  }

  sendFinish(client: connection, message: string) {
    this.sendResponse(client, 'finish', message);
  }

  sendJoin(client: connection) {
    this.sendResponse(client, 'join', '');
  }

  sendResponse(client: connection, type: string, stringContenrt: string) {
    const responseMessage: IServerResponseMessage = {
      type: type,
      content: stringContenrt,     
    };
    client.sendUTF(JSON.stringify(responseMessage));
  }
}       
