import { IAuthorisedUser, IGameStatus, IServerRequestMessage, IServerResponseMessage, IUser } from "./socketServerInterface";
import websocket, { client, server } from 'websocket';
import { Durak } from './durak';
import http from 'http';

export class SocketService {
  private clients: Array<websocket.connection> = [];
  private authorisedUsers: Array<IAuthorisedUser> = []; 
  game: Durak;

  constructor(server:http.Server) {
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
    
          const requestMessage: IServerRequestMessage = JSON.parse(message.utf8Data);
    
          if (requestMessage.type === 'message') {
            this.sendMessageStatus(connection);
            this.clients.forEach(client => {
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
            const joined = this.authorisedUsers.find(authorised => {
              return authorised.connection === connection;
            })
            if(joined) {
              this.game.joinUser(joined.userData);
            }
            if(this.game.getPlayers() > 1) {
              this.game.startGame();
              this.authorisedUsers.forEach(user => {
                this.sendGameStatus(user.connection, this.game);
              });
            }
          }
          if (requestMessage.type === 'attack') {
            console.log(requestMessage);
            const authorised = this.authorisedUsers.find(authorised => {
              return authorised.connection === connection;
            })
            const player =  this.game.players.find(player => {
              return player.userName === authorised.userData.userName;
            });
            this.game.attack(player, JSON.parse(requestMessage.content));
            this.authorisedUsers.forEach(user => {
              this.sendGameStatus(user.connection, this.game);
            });
          }
          if (requestMessage.type === 'defend') {
            const authorised = this.authorisedUsers.find(authorised => {
              return authorised.connection === connection;
            })
            const player =  this.game.players.find(player => {
              return player.userName === authorised.userData.userName;
            });
            //this.game.defend(player, JSON.parse(requestMessage.content));
          }
        } else {
          throw new Error('Not utf8');
        }
      });
    
      connection.on('close', (reasonCode, description) => {
        this.authorisedUsers = this.authorisedUsers.filter((client) => client.connection !== connection);
        this.clients = this.clients.filter((client) => client !== connection);
    
        this.clients.forEach((client) => {
          this.sendUsers(client);
        });
        
        console.log('Client has disconnected.');
      });
    });
  }

  sendUsers(client:websocket.connection) {
    const responseMessage: IServerResponseMessage = {
      type: 'userList',
      content: JSON.stringify(
        this.authorisedUsers.map((user) => ({ userName: user.userData.userName }))
      ),
    };

    client.sendUTF(JSON.stringify(responseMessage));
  }

  sendMessageStatus(client:websocket.connection) {
    const responseStatus: IServerResponseMessage = {
      type: 'message-status',
      content: 'ok',
    };
    client.sendUTF(JSON.stringify(responseStatus));
  }

  sendMessage(client:websocket.connection, message:string) {
    const responseMessage: IServerResponseMessage = {
      type: 'message',
      content: message,
    };
    client.sendUTF(JSON.stringify(responseMessage));
  }

  sendAuth(client:websocket.connection, user: IUser) {
    const responseAuth: IServerResponseMessage = {
      type: 'auth',
      content: JSON.stringify(user),
    }
    client.sendUTF(JSON.stringify(responseAuth));
  }

  sendGameStatus(client:websocket.connection, game: Durak) {
    const authorisedUser = this.authorisedUsers.find(authorised => {
      return authorised.connection === client;
    });
    if(!authorisedUser) return;
    const player = game.players.find(player => {
      return player.userName === authorisedUser.userData.userName;
    });
    if(!player) return;
    const gameStatus: IGameStatus = {
      players : game.players.map(player => {
        return {
          user: player.userName,
          cardsCount: player.cards.length,
        }
      }),
      cardsCountInStack: game.cards.length,
      trumpCard: game.trumpCard,
      playerCards: player.cards,
      actionCards: game.cardsInAction.map(action => {
        return {
          attack: action.attack, 
          defend: action.defend
        }
      }),
    }
    const responseGame: IServerResponseMessage = {
      type: 'game',
      content: JSON.stringify(gameStatus),
    }

    client.sendUTF(JSON.stringify(responseGame));
  }
}