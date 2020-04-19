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
    const evidencePhrase = getEvidencePhrase(
      currentWitnessObj.evidence
    ).toLowerCase();
    // add an extra "actually" if the other side has presented
    const extraActually =
      currentWitnessObj.role !== members[0].role ? "actually " : "";
    const nameText =
      accusedName !== ownName ? `${accusedName} was ` : "you were ";
    helperElement = (
      <Text textAlign="center" marginTop={2}>
        It's your turn! Explain how the {evidencePhrase} {extraActually}shows
        that {nameText}
        {currentWitnessObj.role === Role.DEFENSE
          ? "in the clear"
          : "being a jerk"}
        .
      </Text>
    );
  } else if (currentWitnessObj) {
    let referToAccused: string;
    if (accusedName === currentWitness) {
      referToAccused = "themselves";
    } else if (accusedName === ownName) {
      referToAccused = "your innocence";
    } else {
      referToAccused = accusedName;
    }
    helperElement = (
      <Text textAlign="center" marginTop={2}>
        {currentWitness} is making their case{" "}
        {currentWitnessObj.role === Role.DEFENSE ? "for" : "against"}{" "}
        {referToAccused}, with the{" "}
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
          : `When ${currentWitness} is done, it's deliberation!${
              ownObj?.role === Role.JUDGE
                ? " Make your decision about who's in the wrong before you end the trial."
                : ""
            }`}
      </Text>
      {!!nextWitnessWarning && (
        <Text textAlign="center" marginTop={2}>
          {nextWitnessWarning}
        </Text>
      )}
      {nextButtonElement}
      {members.map(({ name, role, evidence: ownEvidence }) => (
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
          backgroundColor={getBackgroundColor(role)}
        >
          <Text fontSize="xl">
            {name}
            {props.state.ownName === name && " (you)"}
          </Text>
          <Text fontSize="sm">Role: {getRoleName(role)}</Text>
          {!!ownEvidence.length && (
            <Text fontSize="sm">
              Evidence: {getEvidencePhrase(ownEvidence)}
            </Text>
          )}
        </Flex>
      ))}
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

function getBackgroundColor(role: Role) {
  if (role === Role.JUDGE) {
    return "#e2e8f0";
  } else if (role === Role.PROSECUTION) {
    return "#feb2b2";
  } else if (role === Role.DEFENSE) {
    return "#f0fff4";
  }
}

function getRoleName(role: Role) {
  switch (role) {
    case Role.DEFENSE:
      return "Defense";
    case Role.PROSECUTION:
      return "Prosecution";
    case Role.JUDGE:
      return "Judge";
  }
}
