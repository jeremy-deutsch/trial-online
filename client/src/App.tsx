import React, { useState, useRef, useEffect } from "react";
import logo from "./logo.svg";
import socketio from "socket.io-client";
import { ClientState } from "../../sharedTypes";
import "./App.css";
import InitialScreen from "./components/InitialScreen";
import WaitingScreen from "./components/WaitingScreen";
import SidingScreen from "./components/SidingScreen";
import TrialScreen from "./components/TrialScreen";

export type SocketRef = React.RefObject<SocketIOClient.Socket | null>;

// should be equivalent to Role in sharedTypes
export enum Role {
  DEFENSE,
  JUDGE,
  PROSECUTION,
}

const mockState: ClientState = {
  type: "TRIAL",
  accusedName: "Livio",
  crime: "Livio stole the Declaration of Independence!",
  evidence: ["Blood", "Hot dog", "Bad wifi", "Hailing", "Post-Its"],
  members: [
    {
      name: "Jeremy",
      role: Role.DEFENSE,
      hasPresented: false,
      evidence: ["Blood"],
    },
    {
      name: "Cindy",
      role: Role.JUDGE,
      hasPresented: false,
      evidence: [],
    },
    {
      name: "Mark",
      role: Role.PROSECUTION,
      hasPresented: false,
      evidence: ["Hot dog"],
    },
    {
      name: "Livio",
      role: Role.DEFENSE,
      hasPresented: false,
      evidence: ["Bad wifi"],
    },
    {
      name: "Zuoming",
      role: Role.PROSECUTION,
      hasPresented: true,
      evidence: ["Hailing"],
    },
  ],
  currentWitness: "Mark",
  nextWitness: "Livio",
  ownName: "Jeremy",
  roomCode: "OEK",
  isHost: true,
};

function App() {
  const [gameState, setGameState] = useState<ClientState | null>(null);

  const socketRef = useRef<SocketIOClient.Socket | null>(null);
  useEffect(() => {
    socketRef.current = socketio("/");
    socketRef.current.on("state", setGameState);
    return () => {
      socketRef.current?.close();
    };
  }, []);

  switch (gameState?.type) {
    case undefined: {
      return <InitialScreen socketRef={socketRef} />;
    }
    case "WAITING": {
      return <WaitingScreen socketRef={socketRef} state={gameState} />;
    }
    case "SIDING": {
      return <SidingScreen socketRef={socketRef} state={gameState} />;
    }
    case "TRIAL": {
      return <TrialScreen socketRef={socketRef} state={gameState} />;
    }
    default: {
      return <div>ERROR: should not see this</div>;
    }
  }
}

export default App;
