import React, { FC, useEffect, useState } from 'react';
import { IGameStatus, IServerRequestMessage, IServerResponseMessage, IUser } from "./socketInterface";
import { SocketModel } from "./socket";
import { AuthsView } from "./auth";
import { GameField } from './cardGame/cardField';
export const App = () => <SocketApp />;

export const SocketApp = () => {
  const [websocket, setWebsocket] = useState<SocketModel>(null);
  const [messages, setMessages] = useState<Array<IMessage>>([]);
  const [users, setUsers] = useState<Array<IUser>>([]);
  const [currentUser, setCurrentUser] = useState<IUser>(null);
  const [gameStatus, setGameStatus] = useState<IGameStatus>(null);

  useEffect(() => {
    const _websocket = new SocketModel();
    _websocket.onMessage = (text) => {
      setMessages((prev) => {
        return [...prev, { text: text }];
      });
    };
    _websocket.onUserList = (users) => {
      setUsers(users);
    };
    _websocket.onAuth = (user) => {
      setCurrentUser(user);
    }
    _websocket.onGameStatus = (gameStatus) => {
      setGameStatus(gameStatus);
    }
    setWebsocket(_websocket);
    return () => {_websocket.destroy()};
  }, []);

  function handlClick() {
    websocket.sendMessage('Done');
  }

  return (
    <div>
      {
        !currentUser && 
        <AuthsView onUserAuth={(user) => {
          websocket.auth(user);
        }}/>
      }
      {currentUser && <>
        <button onClick={handlClick}>Send</button>
        <UserList users={users} />
        <div className="messages">
          {messages.map((message) => (
            <MessageView {...message} />
          ))}
        </div>
        <input className="input" />
        <button onClick={() => websocket.join()}>join</button>
        {
          gameStatus &&
          <GameField data={ gameStatus } onAction={(card) => {
            websocket.attack(card);
          }}/>
        }
      </>}
    </div>
  );
};

interface IMessage {
  text: string;
}

export const UserList: FC<{ users: Array<IUser> }> = ({ users }) => {
  return (
    <>
      {users.map((user) => (
        <UserView {...user} />
      ))}
    </>
  );
};

export const UserView: FC<IUser> = ({ userName }) => {
  return <div className="user">{userName}</div>;
};

export const MessageView: FC<IMessage> = ({ text }) => {
  return <div className="message">{text}</div>;
};
