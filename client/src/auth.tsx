import React, { FC, useEffect, useState } from 'react';
import { IUser } from './socketInterface';

export const AuthsView = ({onUserAuth}:{onUserAuth:(user:IUser) => void}) => {
  const [userName, setUserName] = useState('');

  return <div>
    <div>authorisation</div>
    <input value={userName} onChange={(e) => {
      setUserName(e.target.value);
    }}/>
    <button onClick={() => {
      const user: IUser = {userName:userName}
      onUserAuth(user);
    }}>send name</button>
    </div>
}