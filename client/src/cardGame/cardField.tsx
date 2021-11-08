import React, { FC, useEffect, useState } from 'react';
import { ICard, IGameStatus } from '../socketInterface';

export const GameField = ({ data, onAction }:{ data: IGameStatus, onAction: (card:ICard) => void}) => {
  return <div>
    <MyPlayer cards={data.playerCards} onAction={ (card) => onAction(card) }/>
    <Actions cardsInAction={data.actionCards}/>
    <Deck count={data.cardsCountInStack} trumpCard={data.trumpCard}/>
    <EnemyPlayer />   
  </div>
}

export const MyPlayer = ({ cards, onAction }:{ cards: Array<ICard>, onAction: (card:ICard) => void}) => {
  return <div>
    <MyCards cards={ cards } onSelect={ (card) => onAction(card)}/>
    <button onClick={() => {}}>Отбить</button>
    <button onClick={() => {}}>Забрать</button>
  </div>
}

export const MyCards = ({ cards, onSelect}:{ cards: Array<ICard>, onSelect: (card:ICard) => void}) => {
  return <div>
    {cards.map(card => <div onClick={() => onSelect(card)} style={{fontSize: '20px', width: '40px', height: '40px', border: '1px solid black', background: 'red'}}>{card.value.toString() + ' ' + card.suit.toString()}</div>)}
  </div>
}


/*export const MyControls = () => {
  return <div>
    
  </div>
}*/


export const EnemyPlayer = () => {
  return <div> </div>
}


export const Actions = ({ cardsInAction }:{ cardsInAction:Array<{attack: ICard, defend: ICard}>}) => {
  return <div>
    {cardsInAction.map(action => {
      return <div>
        <div>{'attack: ' + action.attack.value.toString() + ' ' + action.attack.suit.toString()}</div>
        {action.defend && <div>{'defend: ' + action.defend.value.toString() + ' ' + action.defend.suit.toString()}</div>}
      </div>
    })}
  </div>
}

export const Deck = ({ count, trumpCard }:{ count: number, trumpCard: ICard }) => {
  return <div>
    <div>{count.toString()}</div>
    <div>{trumpCard.value.toString() + ' ' + trumpCard.suit.toString()}</div>
  </div>
}