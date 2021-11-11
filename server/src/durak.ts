import { ICard, IUser } from '../../client/src/socketInterface';

// TODO: class StartGame
// TODO: class Validation
// TODO: refactor gameStatus
// TODO: enum for boolean
// TODO: кейс for userDisconnect
// TODO: change naming
// TODO: rooms for diferent games

export class Durak {
  public isStarted: boolean = false;
  public cards: Array<Card> = [];
  public players: Array<Player> = [];
  public currentPlayerIndex: number = 0;
  public trump: number = 0;
  public cardsInAction: Array<{ attack: Card; defend: Card }> = [];
  public trumpCard: Card = null;
  public onFinish: () => void;

  constructor() {}

  createCards() {
    let cards: Array<Card> = [];
    for (let i = 11; i <= 14; i++) {
      for (let j = 0; j <= 3; j++) {
        const card = new Card(i, j);
        cards.push(card);
      }
    }

    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i);
      const temp = cards[i];
      cards[i] = cards[j];
      cards[j] = temp;
    }

    return cards;
  }

  startGame() {
    this.isStarted = true;
    this.cards = this.createCards();
    const trumpCard = this.cards.pop();
    this.trumpCard = trumpCard;
    this.trump = trumpCard.suit;
    this.cards.unshift(trumpCard);
    this.processCards();
  }

  joinUser(user: IUser) {
    if (this.isStarted) return;
    const player = new Player(user.userName);
    this.players.push(player);
  }

  processCards() {
    this.players.forEach((_, index) => {
      const playerIndex =
        (this.currentPlayerIndex + index) % this.players.length;
      const player = this.players[playerIndex];

      while (player.cards.length < 6 && this.cards.length) {
        player.cards.push(this.cards.pop());
      }
    });

    const winners = this.players.filter((player) => !player.cards.length);
    console.log(winners);

    if (winners.length === this.players.length - 1) {
      this.finishGame();
    }
    if (winners.length === this.players.length) {
      this.finishGame();
    }
  }

  turn(userName: string) {
    const player = this.getPlayerByName(userName);
    if (player !== this.getCurrentPlayer()) return;

    const isAll = this.cardsInAction.every((action) => action.defend != null);
    if (isAll) {
      this.cardsInAction = [];

      this.currentPlayerIndex =
        (this.currentPlayerIndex + 1) % this.players.length;

      this.processCards();
    }
  }

  epicFail(userName: string) {
    const looser = this.getDefender();

    const player = this.getPlayerByName(userName);
    if (player !== looser) return;

    this.cardsInAction.forEach((action) => {
      looser.cards.push(action.attack);
      if (action.defend) {
        looser.cards.push(action.defend);
      }
    });
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 2) % this.players.length;

    this.cardsInAction = [];
    this.processCards();
  }

  pickCard(player: Player, card: Card) {
    player.cards = player.cards.filter(
      (playerCard) => !playerCard.isEqual(card)
    );
    this.cardsInAction.push({ attack: card, defend: null });
  }

  attack(player: Player, card: Card) {
    console.log(player.userName + ' ON ATTACK!!!');
    if (!this.cardsInAction.length && player === this.getCurrentPlayer()) {
      this.pickCard(player, card);
    } else {
      const isFound = !!this.cardsInAction.find(
        (action) =>
          card.value === action.attack.value ||
          card.value === action.defend?.value
      );
      if (isFound && player !== this.getDefender()) {
        this.pickCard(player, card);
      }
    }
  }

  defend(player: Player, card: Card, attackCard: Card) {
    console.log('entery');
    if (player === this.getDefender()) {
      console.log('2 point');
      if (card.compare(attackCard, this.trump)) {
        console.log('3 point');
        player.cards = player.cards.filter(
          (playerCard) => !playerCard.isEqual(card)
        );
        const currentAction = this.cardsInAction.find(
          (action) => action.attack === attackCard
        );
        currentAction.defend = card;
      }
    }
  }

  insertPlayerCard() {
    
  }

  getPlayers() {
    return this.players.length;
  }

  getDefender() {
    return this.players[(this.currentPlayerIndex + 1) % this.players.length];
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  getPlayerByName(name: string) {
    return this.players.find((player) => {
      return player.userName === name;
    });
  }

  finishGame() {
    this.players = [];
    this.isStarted = false;
    this.onFinish();
  }
}

class Player {
  public userName: string = '';
  public cards: Array<Card> = [];

  constructor(userName: string) {
    this.userName = userName;
  }
}

class Card {
  public value: number;
  public suit: number;

  constructor(value: number, suit: number) {
    this.value = value;
    this.suit = suit;
  }

  compare(attackCard: Card, trump: number) {
    if (attackCard.suit != this.suit && this.suit != trump) return false;
    console.log(attackCard.getTotal(trump) + ' ON ' + this.getTotal(trump));
    return attackCard.getTotal(trump) < this.getTotal(trump);
  }

  isEqual(card: ICard) {
    return this.value === card.value && this.suit === card.suit;
  }

  getTotal(trump:number) {
    return this.value + (this.suit == trump ? 14 : 0);
  }
}
