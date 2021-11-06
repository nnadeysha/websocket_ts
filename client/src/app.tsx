import React, { FC, useEffect, useState } from 'react';

export const App = () => <SocketApp />;

interface IServerResponseMessage {
  type: string;
  content: string;
}

interface IServerRequestMessage {
  type: string;
  content: string;
}

export const SocketApp = () => {
  const [websocket, setWebsocket] = useState<WebSocket>(null);
  const [messages, setMessages] = useState<Array<IMessage>>([]);
  const [users, setUsers] = useState<Array<IUser>>([]);

  useEffect(() => {
    const _websocket = new window.WebSocket('ws://localhost:3000/');

    _websocket.onopen = () => {
      // setUsers();

      const request: IServerRequestMessage = {
        type: 'userList',
        content: '',
      };

      _websocket.send(JSON.stringify(request));
      setWebsocket(_websocket);
    };

    _websocket.onmessage = (ev) => {
      const response: IServerResponseMessage = JSON.parse(ev.data);

      if (response.type === 'message') {
        setMessages((prev) => {
          return [...prev, { text: response.content }];
        });
      }

      if (response.type === 'userList') {
        console.log(response);
        const users: Array<IUser> = JSON.parse(response.content);

        setUsers(users);
      }
    };

    _websocket.onerror = () => {};
    _websocket.onclose = () => {};

    return () => {
      _websocket.onclose = null;
      _websocket.close();
    };
  }, []);

  function handlClick() {
    const request: IServerRequestMessage = {
      type: 'message',
      content: 'Done',
    };

    websocket.send(JSON.stringify(request));
  }

  return (
    <div>
      <button onClick={handlClick}>Send</button>
      <UserList users={users} />
      <div className="messages">
        {messages.map((message) => (
          <MessageView {...message} />
        ))}
      </div>
      <input className="input" />
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

interface IUser {
  userName: string;
}

export const UserView: FC<IUser> = ({ userName }) => {
  return <div className="user">{userName}</div>;
};

export const MessageView: FC<IMessage> = ({ text }) => {
  return <div className="message">{text}</div>;
};
