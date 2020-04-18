import React, { useState, useRef, useEffect } from "react";
import logo from "./logo.svg";
import socketio from "socket.io-client";
import { ClientState } from "../../sharedTypes";
import "./App.css";
import InitialScreen from "./components/InitialScreen";
import WaitingScreen from "./components/WaitingScreen";

export type SocketRef = React.RefObject<SocketIOClient.Socket | null>;

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
    default: {
      return <div>ERROR: should not see this</div>;
    }
  }
}

export default App;
