import React, { useState } from "react";
import { ClientTrialState, ErrorResponse } from "../../../sharedTypes";
import { SocketRef, Role } from "../App";
import { Flex, Text, Button } from "@chakra-ui/core";
import RoomCodeBox from "./RoomCodeBox";

interface Props {
  state: ClientTrialState;
  socketRef: SocketRef;
}

export default function TrialScreen(props: Props) {
  const [nextWitnessWarning, setNextWitnessWarning] = useState<string | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);

  const {
    evidence,
    members,
    accusedName,
    nextWitness,
    currentWitness,
    ownName,
  } = props.state;

  const callNextWitness = () => {
    if (nextWitness == null && nextWitnessWarning == null) {
      setNextWitnessWarning("Are you sure you want to end the trial?");
    } else {
      props.socketRef.current?.emit("witness", (error: ErrorResponse) => {
        setError(error.message);
      });
    }
  };

  let helperElement: React.ReactNode = null;
  const currentWitnessObj = members.find(
    (member) => member.name === currentWitness
  );
  if (currentWitnessObj && currentWitnessObj.name === ownName) {
    helperElement = (
      <Text textAlign="center" marginTop={2}>
        It's your turn! Present the{" "}
        {getEvidencePhrase(currentWitnessObj.evidence).toLowerCase()} to show
        that {accusedName} was{" "}
        {currentWitnessObj.role === Role.DEFENSE
          ? "totally in the clear"
          : "being a jerk"}
        .
      </Text>
    );
  } else if (currentWitnessObj) {
    helperElement = (
      <Text textAlign="center" marginTop={2}>
        {currentWitness} is making their case{" "}
        {currentWitnessObj.role === Role.DEFENSE ? "for" : "against"}{" "}
        {accusedName !== currentWitness ? accusedName : "themselves"}, with the{" "}
        {getEvidencePhrase(currentWitnessObj.evidence).toLowerCase()} as
        evidence.
      </Text>
    );
  }
  const ownObj = members.find((member) => member.name === ownName);
  let nextButtonElement: React.ReactNode = null;
  if (ownObj?.role === Role.JUDGE || props.state.isHost) {
    let buttonText: string;
    if (nextWitness) {
      buttonText = `Call ${nextWitness} to the stand`;
    } else {
      buttonText = `Done making verdict`;
    }
    nextButtonElement = (
      <Button fontSize="lg" marginTop={2} onClick={callNextWitness}>
        {buttonText}
      </Button>
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
      {helperElement}
      <Text textAlign="center" marginTop={2}>
        {nextWitness != null
          ? `Next up: ${nextWitness}`
          : `When ${currentWitness} is done, it's deliberation!`}
      </Text>
      {!!nextWitnessWarning && (
        <Text textAlign="center" marginTop={2}>
          {nextWitnessWarning}
        </Text>
      )}
      {nextButtonElement}
    </Flex>
  );
}

function getEvidencePhrase(evidence: string[]) {
  if (!evidence.length) return "nothing";
  else if (evidence.length === 1) return evidence[0];
  else if (evidence.length === 2) return `${evidence[0]} and ${evidence[1]}`;
  else {
    return (
      evidence.slice(0, -1).join(", ") +
      `, and ${evidence[evidence.length - 1]}`
    );
  }
}
