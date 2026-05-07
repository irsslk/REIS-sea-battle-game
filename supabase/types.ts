export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type GameMode = "bot" | "multiplayer";
export type GameStatus = "waiting" | "active" | "finished" | "cancelled";
export type BotLevel = "easy" | "medium" | "hard";
export type MoveResult = "hit" | "miss" | "sunk";
export type LeaderboardScope = "city" | "country" | "region";

export interface UserRow {
  id: string;
  email: string;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  username: string;
  full_name: string | null;
  city: string | null;
  country: string | null;
  region: string;
  avatar_url: string | null;
  selected_theme: string;
  elo: number;
  games_played: number;
  wins: number;
  losses: number;
  accuracy: number;
  favorite_ship: string | null;
  updated_at: string;
}

export interface GameRow {
  id: string;
  mode: GameMode;
  status: GameStatus;
  player_one_id: string | null;
  player_two_id: string | null;
  winner_id: string | null;
  invite_code: string | null;
  bot_level: BotLevel | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface GameMoveRow {
  id: number;
  game_id: string;
  player_id: string;
  move_number: number;
  x: number;
  y: number;
  result: MoveResult;
  ship_name: string | null;
  created_at: string;
}

export interface LeaderboardRow {
  id: number;
  user_id: string;
  city: string | null;
  country: string | null;
  region: string;
  elo: number;
  wins: number;
  losses: number;
  rank_scope: LeaderboardScope;
  snapshot_at: string;
}
