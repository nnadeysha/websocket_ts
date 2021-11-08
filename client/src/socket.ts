import { ICard, IGameStatus, IServerRequestMessage, IServerResponseMessage, IUser } from "./socketInterface";

export class SocketModel {
  private websocket:WebSocket = null;
  public onMessage: (text:string) => void;
  public onUserList: (users:Array<IUser>) => void;
  public onAuth: (user:IUser) => void;
  public onJoin: () => void;
  public onGameStatus: (gameStatus: IGameStatus) => void;

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

      if (response.type === 'game') {
        const gameStatus: IGameStatus = JSON.parse(response.content);
        console.log(gameStatus);
        this.onGameStatus(gameStatus);
      }

      if (response.type === 'join') {
        console.log(response.type);
      }
    };

    _websocket.onerror = () => {};
    _websocket.onclose = () => {};
  }
  destroy() {
    if(this.websocket == null) return;
    this.websocket.onclose = null;
    this.websocket.close();
  }

  sendMessage(content:string) {
    const request: IServerRequestMessage = {
      type: 'message',
      content: content,
    };

    this.websocket.send(JSON.stringify(request));
  }

  auth(user:IUser) {
    const request: IServerRequestMessage = {
      type: 'auth',
      content: JSON.stringify(user),
    };

    this.websocket.send(JSON.stringify(request));
  }

  getUserList() {
    const request: IServerRequestMessage = {
      type: 'userList',
      content: '',
    };

    this.websocket.send(JSON.stringify(request));
  }

  join() {
    const request: IServerRequestMessage = {
      type: 'join',
      content: '',
    };

    this.websocket.send(JSON.stringify(request));
  }

  attack(card:ICard) {
    const request: IServerRequestMessage = {
      type: 'attack',
      content: JSON.stringify(card),
    };

    this.websocket.send(JSON.stringify(request));
  }
}