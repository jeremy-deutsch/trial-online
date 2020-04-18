import express from "express";
import { createServer } from "http";
import socketio from "socket.io";
import path from "path";

import evidence from "./evidence.json";
import crimes from "./crimes.json";
import { ErrorResponse, ClientState, JoinEvent, Role } from "./sharedTypes";

const Express = express();
const server = createServer(Express);
const io = socketio(server);

function error(message: string): ErrorResponse {
  return { type: "ERROR", message };
}

const noNameError = error("You don't have a name. This is probably a bug.");
const noCodeError = error(
  "You don't have a room code. This is probably a bug."
);
const noRoomError = error("You don't have a room. This is probably a bug.");
const notInRoomError = error("You aren't in the room. This is probably a bug.");

type ServerRoomState = ServerWaitingState | ServerSidingState;

interface ServerWaitingState {
  type: "WAITING";
  // the keys are the member names
  members: Map<string, { id: string; isHost: boolean }>;
}

interface ServerSidingState {
  type: "SIDING";
  members: Map<string, { id: string; isHost: boolean; role: Role | null }>;
  defendant: string;
  crime: number;
  evidence: number[];
}

const appState = new Map<string, ServerRoomState>();

// use this for GC
const emitTimes: { [roomCode: string]: number } = {};

const playernameRegex = /\{PLAYERNAME\}/g;
function getClientRoomState(
  roomState: ServerRoomState,
  memberName: string,
  roomCode: string
): ClientState {
  switch (roomState.type) {
    case "WAITING": {
      const memberNames = Array.from(roomState.members.keys());
      const isHost = !!roomState.members.get(memberName)?.isHost;
      return {
        type: "WAITING",
        memberNames,
        ownName: memberName,
        roomCode,
        isHost,
      };
    }
    case "SIDING": {
      const accusedName = roomState.defendant;
      const members: Array<{ name: string; hasDecided: boolean }> = [];
      // note that there should only be one judge during siding, but not
      // necessarily during the trial
      let judgeName = "ERROR";
      roomState.members.forEach(({ role }, name) => {
        members.push({ name, hasDecided: role != null });
        if (role === Role.JUDGE) {
          judgeName = name;
        }
      });
      const isHost = !!roomState.members.get(memberName)?.isHost;
      return {
        type: "SIDING",
        crime: crimes[roomState.crime].replace(playernameRegex, accusedName),
        accusedName,
        members,
        judgeName,
        evidence: roomState.evidence.map((index) => evidence[index]),
        ownName: memberName,
        roomCode,
        isHost,
      };
    }
  }
}

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function createRoom(name: string, id: string) {
  let roomCode: string;
  do {
    roomCode = "";
    for (let i = 0; i < 3; i++) {
      roomCode += letters[Math.floor(Math.random() * letters.length)];
    }
  } while (appState.has(roomCode));

  appState.set(roomCode, {
    type: "WAITING",
    members: new Map([[name, { id, isHost: true }]]),
  });
  return roomCode;
}

function joinRoom(roomCode: string, name: string, id: string) {
  const roomState = appState.get(roomCode);
  if (!roomState) return error("No room exists with that code!");
  if (roomState.members.size > 15 && !roomState.members.has(name)) {
    return error("Room is full!");
  }
  const wasHost = !!roomState.members.get(name)?.isHost;
  if (roomState.type === "WAITING") {
    roomState.members.set(name, { id, isHost: wasHost });
  }
}

function startChoosingSides(roomCode: string) {
  const roomState = appState.get(roomCode);
  if (!roomState) return noRoomError;
  if (roomState.members.size < 4) return error("At least 4 players required.");
  const members: ServerSidingState["members"] = new Map();
  const memberLottery = Array.from(roomState.members.keys());
  shuffleArray(memberLottery);
  const judgeName = memberLottery[0];
  const defendantName = memberLottery[1];
  if (roomState.type === "SIDING") {
    return error(
      "You can't restart the round while users are choosing sides. What would that even do?"
    );
  } else {
    roomState.members.forEach(({ id, isHost }, name) => {
      let role: Role | null = null;
      if (name === judgeName) role = Role.JUDGE;
      else if (name === defendantName) role = Role.DEFENSE;
      members.set(name, { id, isHost, role });
    });
  }
  const crime = Math.floor(Math.random() * crimes.length);
  // provide enough evidence for each person to get their own
  const evidenceIndices = new Set<number>();
  let iterations = 0;
  while (evidenceIndices.size < members.size - 1) {
    evidenceIndices.add(Math.floor(Math.random() * evidence.length));
    if (iterations++ > 150) return error("Couldn't gather enough evidence.");
  }
  const newState: ServerSidingState = {
    type: "SIDING",
    members,
    crime,
    defendant: defendantName,
    evidence: Array.from(evidenceIndices),
  };
  appState.set(roomCode, newState);
}

function shuffleArray(array: unknown[]) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function chooseRole(roomCode: string, name: string, role: Role) {
  const roomState = appState.get(roomCode);
  if (!roomState) return noRoomError;
  if (roomState.type !== "SIDING") {
    return error("The room isn't taking any role decisions right now.");
  }
  const member = roomState.members.get(name);
  if (!member) return notInRoomError;
  if (member.role != null) {
    return error("You already chose a role!");
  }
  member.role = role;
}

io.on("connection", (socket) => {
  let roomCode: string | null = null;
  let name: string | null = null;

  const emitNewState = () => {
    if (!roomCode) return;
    const roomState = appState.get(roomCode);
    if (!roomState) return;
    roomState.members.forEach(({ id }, name) => {
      if (roomCode) {
        const clientState = getClientRoomState(roomState, name, roomCode);
        io.to(id).emit("state", clientState);
      }
    });
    emitTimes[roomCode] = Date.now();
  };

  socket.on("create", (newName: string) => {
    roomCode = createRoom(newName, socket.id);
    name = newName;
    emitNewState();
  });
  socket.on(
    "join",
    (joinEvent: JoinEvent, errCb: (err: ErrorResponse) => void) => {
      const maybeError = joinRoom(
        joinEvent.roomCode.toUpperCase(),
        joinEvent.name,
        socket.id
      );
      if (maybeError?.type === "ERROR") {
        errCb(maybeError);
      } else {
        // no state should change if joinRoom errors
        roomCode = joinEvent.roomCode.toUpperCase();
        name = joinEvent.name;
        emitNewState();
      }
    }
  );
  socket.on("siding", (errCb: (error: ErrorResponse) => void) => {
    if (!name) return errCb(noNameError);
    if (!roomCode) return errCb(noCodeError);
    const roomState = appState.get(roomCode);
    if (!roomState) return errCb(noRoomError);
    const memberInfo = roomState.members.get(name);
    if (!memberInfo) return errCb(notInRoomError);
    if (!memberInfo.isHost) {
      return errCb(error("You aren't the host of this room."));
    }

    const maybeError = startChoosingSides(roomCode);
    if (maybeError) return errCb(maybeError);
    emitNewState();
  });
  socket.on(
    "role",
    (
      role: Role.DEFENSE | Role.PROSECUTION,
      errCb: (error: ErrorResponse) => void
    ) => {
      if (!name) return errCb(noNameError);
      if (!roomCode) return errCb(noCodeError);
      if (role == null) return errCb(error("Didn't send a role."));
      const maybeError = chooseRole(roomCode, name, role);
      if (maybeError) return errCb(maybeError);
      emitNewState();
    }
  );
});

// Serve static files from the React app
Express.use(express.static(path.join(__dirname, "client/build")));

// The "catchall" handler: for any request that doesn't
// match another, send back React's index.html file.
Express.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/client/build/index.html"));
});

const port = process.env.PORT || 3200;

server.listen(port, () => {
  console.log("listening at port 3200!");
});
