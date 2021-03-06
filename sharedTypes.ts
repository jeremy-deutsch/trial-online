export type ClientState =
  | ClientWaitingState
  | ClientSidingState
  | ClientTrialState;

export interface ClientWaitingState {
  type: "WAITING";
  memberNames: string[];
  ownName: string;
  roomCode: string;
  isHost: boolean;
}

export enum Role {
  DEFENSE,
  JUDGE,
  PROSECUTION,
}

export interface ClientSidingState {
  type: "SIDING";
  judgeName: string;
  accusedName: string;
  members: Array<{ name: string; hasDecided: boolean }>;
  crime: string;
  evidence: string[];
  ownName: string;
  roomCode: string;
  isHost: boolean;
  ownRole: Role | null;
}

export interface ClientTrialState {
  type: "TRIAL";
  accusedName: string;
  members: Array<{
    name: string;
    evidence: string[];
    role: Role;
    hasPresented: boolean;
  }>;
  crime: string;
  evidence: string[];
  currentWitness: string;
  nextWitness: string | null;
  ownName: string;
  roomCode: string;
  isHost: boolean;
}

export interface JoinEvent {
  roomCode: string;
  name: string;
}

export interface ErrorResponse {
  type: "ERROR";
  message: string;
}
