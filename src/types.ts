export type GameRole = 'HOST' | 'CLIENT' | 'SINGLE' | null;

export interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
}

export interface Enemy {
  id: string;
  text: string;
  x: number; // percentage (10 to 90)
  y: number; // pixel positions (0 to container height)
  speed: number;
  targetPlayerId: string;
}

export interface GameState {
  isPlaying: boolean;
  isGameOver: boolean;
  score: number;
  wave: number;
  hp: number;
  enemies: Enemy[];
}

export interface GameMessage {
  type: 'PLAYER_JOIN' | 'PLAYER_LEAVE' | 'SYNC_PLAYERS' | 'START_GAME' | 'SYNC_GAME' | 'SUBMIT_WORD' | 'GAME_OVER_TRIGGER' | 'USE_SKILL';
  payload: any;
}
