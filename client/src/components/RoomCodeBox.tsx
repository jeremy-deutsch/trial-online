import React from "react";
import { Flex, Text } from "@chakra-ui/core";

interface Props {
  roomCode: string;
}

export default function RoomCodeBox(props: Props) {
  return (
    <Flex flexDirection="column" alignSelf="center" alignItems="center">
      <Text fontSize="md">Room Code</Text>
      <Text fontSize="3xl" marginTop={0} as="h1">
        {props.roomCode}
      </Text>
    </Flex>
  );
}
