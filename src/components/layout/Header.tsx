import {
  Box,
  Flex,
  Avatar,
  Link,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useDisclosure,
  useColorModeValue,
  Stack,
  useColorMode,
  Center,
  Text,
  Heading,
} from "@chakra-ui/react";

import {
  useConnect,
  useDisconnect,
  useAccount,
  useBalance,
  useNetwork,
  Connector,
} from "wagmi";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { goerli, polygonMumbai as mumbai } from "wagmi/chains";

import { truncate } from "../../utils/truncate";

const md5 = require("md5");

// const NavLink = ({ children }: { children: ReactNode }) => (
//   <Link
//     px={2}
//     py={1}
//     rounded={"md"}
//     _hover={{
//       textDecoration: "none",
//       bg: useColorModeValue("gray.200", "gray.700"),
//     }}
//     href={"#"}
//   >
//     {children}
//   </Link>
// );
type HeaderProps = {
  connector: Connector;
};
export default function Header({ connector }: HeaderProps) {
  const { isConnected, address } = useAccount();
  const { connect, isLoading } = useConnect({
    connector,
  });
  const { disconnect } = useDisconnect();

  const { chain } = useNetwork();

  const handleConnectButtonClick = async () => {
    connect();
  };

  const handleDisconnectButtonClick = async () => {
    disconnect();
  };

  return (
    <>
      <Box bg={useColorModeValue("gray.100", "gray.900")} px={4}>
        <Flex h={16} alignItems={"center"} justifyContent={"space-between"}>
          <Box minWidth="20%">Logo</Box>
          <Heading>{chain?.name ?? ""}</Heading>
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
