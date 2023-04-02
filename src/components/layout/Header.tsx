import {
  Avatar,
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";

import { useEffect } from "react";
import {
  Connector,
  useAccount,
  useConnect,
  useDisconnect,
  useNetwork,
} from "wagmi";
import { truncate } from "../../utils/truncate";

const md5 = require("md5");

type HeaderProps = {
  handleConnectButtonClick : async() => void;
  handleDisconnectButtonClick : async() => void;
  setConnectedStatus: (isConnected: boolean) => void;
};
export default function Header({ connector, setConnectedStatus }: HeaderProps) {
  return (
    <>
      <Box bg={useColorModeValue("gray.100", "gray.900")} px={4}>
        <Flex h={16} alignItems={"center"} justifyContent={"space-between"}>
          <Box minWidth="20%"></Box>
          <Heading>{chain?.name ?? "ERC20 BRIDGE"}</Heading>
          <Flex minWidth="20%" alignItems={"center"} justify="right">
            <Stack direction={"row"} spacing={7}>
              {isConnected ? (
                <Menu>
                  <MenuButton
                    as={Button}
                    rounded={"full"}
                    variant={"link"}
                    cursor={"pointer"}
                    minW={0}
                  >
                    <Flex align="center">
                      <Text mr={4}>{truncate(address as string, 6)}</Text>
                      <Avatar
                        size={"sm"}
                        src={`https://www.gravatar.com/avatar/${md5(
                          address
                        )}/?d=identicon`}
                      />
                    </Flex>
                  </MenuButton>
                  <MenuList alignItems={"center"}>
                    <br />
                    <Center>
                      <Avatar
                        size={"2xl"}
                        src={`https://www.gravatar.com/avatar/${md5(
                          address
                        )}/?d=identicon`}
                      />
                    </Center>
                    <br />
                    <Center>
                      <Text>{truncate(address as string, 6)}</Text>
                    </Center>
                    <br />
                    <MenuDivider />
                    <MenuItem justifyContent="center">
                      <Button
                        colorScheme="orange"
                        variant="solid"
                        isLoading={isLoading}
                        onClick={handleDisconnectButtonClick}
                      >
                        Disconnect
                      </Button>
                    </MenuItem>
                  </MenuList>
                </Menu>
              ) : (
                <Button
                  colorScheme="orange"
                  variant="solid"
                  isLoading={isLoading}
                  onClick={handleConnectButtonClick}
                >
                  Connect Metamask
                </Button>
              )}
            </Stack>
          </Flex>
        </Flex>
      </Box>
    </>
  );
}
