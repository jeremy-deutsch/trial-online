import React, { useState } from "react";
import { ClientSidingState, ErrorResponse } from "../../../sharedTypes";
import { SocketRef, Role } from "../App";
import { Flex, Text, ListItem, Button } from "@chakra-ui/core";
import RoomCodeBox from "./RoomCodeBox";

interface Props {
  state: ClientSidingState;
  socketRef: SocketRef;
}

export default function SidingScreen(props: Props) {
  const [error, setError] = useState<string | null>(null);

  const chooseRole = (role: Role.DEFENSE | Role.PROSECUTION) => {
    props.socketRef.current?.emit("role", role, (error: ErrorResponse) => {
      setError(error.message);
    });
  };

  const startTrial = () => {
    props.socketRef.current?.emit("trial", (error: ErrorResponse) => {
      setError(error.message);
    });
  };

  let helperElement: React.ReactNode;

  const { ownName, accusedName, judgeName, ownRole, isHost } = props.state;

  if (ownName === accusedName) {
    helperElement = (
      <Text textAlign="center">
        You're being accused! Who'll stand by you? You'll be given some of the
        evidence below to help make your case.
      </Text>
    );
  } else if (ownName === judgeName) {
    helperElement = (
      <Text textAlign="center">
        You're the judge. You can call and dismiss witnesses, and make the final
        verdict. Try to be fair!
      </Text>
    );
  } else if (ownRole == null) {
    helperElement = (
      <>
        <Text textAlign="center">
          You're a witness. Will you stand with {accusedName} or against them?
          You'll be given some of the evidence below to make your case.
        </Text>
        <Flex marginTop={2}>
          <Button
            fontSize="lg"
            flex={1}
            onClick={() => chooseRole(Role.DEFENSE)}
          >
            Defend
          </Button>
          <Flex width={2} />
          <Button
            fontSize="lg"
            flex={1}
            onClick={() => chooseRole(Role.PROSECUTION)}
          >
            Prosecute
          </Button>
        </Flex>
      </>
    );
  } else {
    helperElement = (
      <Text textAlign="center">
        You're going to help{" "}
        {ownRole === Role.DEFENSE
          ? `defend ${accusedName}`
          : `bring ${accusedName} to justice`}
        . You'll be given some of the evidence below to make your case.
      </Text>
    );
  }

  return (
    <Flex
      flexDirection="column"
      paddingLeft={[2, "25%"]}
      paddingRight={[2, "25%"]}
      paddingBottom={2}
    >
      <RoomCodeBox roomCode={props.state.roomCode} />
      {!!error && <Text>{error}</Text>}
      <Flex flexDirection="column" alignItems="center" marginTop={2}>
        <Text>THE ACCUSATION:</Text>
        <Text fontSize="lg" textAlign="center">
          {props.state.crime}
        </Text>
      </Flex>
      <Flex flexDirection="column" marginTop={2}>
        {helperElement}
        {isHost && ownRole != null && (
          <Button onClick={startTrial} fontSize="lg" marginTop={2}>
            Start the trial
          </Button>
        )}
      </Flex>
      <Flex flexDirection="column" alignItems="center" marginTop={2}>
        <Text>THE EVIDENCE:</Text>
        <ul>
          {props.state.evidence.map((evidence) => (
            <ListItem key={evidence} paddingRight={2}>
              {evidence}
            </ListItem>
          ))}
        </ul>
      </Flex>
      {props.state.members.map(({ name, hasDecided }) => (
        <Flex
          key={name}
          borderWidth={1}
          borderRadius={3}
          paddingRight={2}
          paddingLeft={3}
          paddingTop={1}
          paddingBottom={1}
          marginTop={2}
          flexDirection="column"
          backgroundColor={getBackgroundColor(name, hasDecided, props.state)}
        >
          <Text fontSize="xl">
            {name}
            {props.state.ownName === name && " (you)"}
          </Text>
          <Text fontSize="sm">
            {getDecidingText(name, hasDecided, props.state)}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}

function getBackgroundColor(
  name: string,
  hasDecided: boolean,
  state: ClientSidingState
) {
  if (name === state.judgeName) {
    return "#e2e8f0";
  } else if (name === state.accusedName) {
    return "#feb2b2";
  } else if (hasDecided) {
    return "#f0fff4";
  } else {
    return "#fefcbf";
  }
}

function getDecidingText(
  name: string,
  hasDecided: boolean,
  state: ClientSidingState
) {
  if (name === state.judgeName) {
    return "The Judge";
  } else if (name === state.accusedName) {
    return "The Accused";
  } else if (hasDecided) {
    return "Chosen!";
  } else if (name === state.ownName) {
    return "Choose a side...";
  } else {
    return "Choosing...";
  }
}
