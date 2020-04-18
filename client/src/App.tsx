import React, { useState, useRef, useEffect } from "react";
import logo from "./logo.svg";
import socketio from "socket.io-client";
import { ClientState } from "../../sharedTypes";
import "./App.css";
import InitialScreen from "./components/InitialScreen";
import WaitingScreen from "./components/WaitingScreen";
import SidingScreen from "./components/SidingScreen";

export type SocketRef = React.RefObject<SocketIOClient.Socket | null>;

// should be equivalent to Role in sharedTypes
export enum Role {
  DEFENSE,
  JUDGE,
  PROSECUTION,
}

const mockState: ClientState = {
  type: "SIDING",
  judgeName: "Cindy",
  accusedName: "Mark",
  crime: "Mark stole the Declaration of Independence!",
  evidence: ["Blood", "Hot dog", "Bad wifi", "Hailing", "Post-Its"],
  members: [
    {
      name: "Jeremy",
      hasDecided: false,
    },
    {
      name: "Cindy",
      hasDecided: true,
    },
    {
      name: "Mark",
      hasDecided: true,
    },
    {
      name: "Livio",
      hasDecided: true,
    },
    {
      name: "Zuoming",
      hasDecided: false,
    },
  ],
  ownRole: null,
  ownName: "Jeremy",
  roomCode: "OEK",
  isHost: false,
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
    default: {
      return <div>ERROR: should not see this</div>;
    }
  }
}

export default App;
