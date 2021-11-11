import {
  ICard,
  IGameStatus,
  IServerRequestMessage,
  IServerResponseMessage,
  IUser,
} from './socketInterface';

export class SocketModel {
  private websocket: WebSocket = null;
  public onMessage: (text: string) => void;
  public onUserList: (users: Array<IUser>) => void;
  public onAuth: (user: IUser) => void;
  public onJoin: () => void;
  public onGameStatus: (gameStatus: IGameStatus) => void;
  public onFinish: () => void;

  constructor() {
    const _websocket = new window.WebSocket('ws://localhost:3000/');

    _websocket.onopen = () => {
      this.websocket = _websocket;
    };

    _websocket.onmessage = (ev) => {
      const response: IServerResponseMessage = JSON.parse(ev.data);

      if (response.type === 'message') {
        this.onMessage(response.content);
      }
      if (response.type === 'userList') {
        console.log(response);
        const users: Array<IUser> = JSON.parse(response.content);
        this.onUserList(users);
      }

      if (response.type === 'auth') {
        const user: IUser = JSON.parse(response.content);
        this.onAuth(user);
        this.getUserList();
      }

      if (response.type === 'join') {
        console.log(response.type);
        this.onJoin();
      }

      if (response.type === 'game') {
        const gameStatus: IGameStatus = JSON.parse(response.content);
        console.log(gameStatus);
        this.onGameStatus(gameStatus);
      }

      if (response.type === 'finish') {
        console.log(response.type);
        this.onFinish();
      }
    };

    _websocket.onerror = () => {};
    _websocket.onclose = () => {};
  }
  destroy() {
    if (this.websocket == null) return;
    this.websocket.onclose = null;
    this.websocket.close();
  }

  sendMessage(content: string) {
    this.sendRequest('message', content);
  }

  auth(user: IUser) {
    this.sendRequest('auth', JSON.stringify(user));
  }

  getUserList() {
    this.sendRequest('userList', '');
  }

  join() {
    this.sendRequest('join', '');
  }

  attack(card: ICard) {
    this.sendRequest('attack', JSON.stringify({attackCard: card}));
  }

  defend(attackCard: ICard, defendCard: ICard) {
    const content = {
      attackCard: attackCard,
      defendCard: defendCard,
    }
    this.sendRequest('defend', JSON.stringify(content));
  }

  turn() {
    this.sendRequest('turn', '');
  }

  epicFail() {
    this.sendRequest('epicFail', '');
  }

  sendRequest(type: string, stringContenrt: string) {
    const request: IServerRequestMessage = {
      type: type,
      content: stringContenrt,
    };

    this.websocket.send(JSON.stringify(request));
  }
}
