import { CheckIcon, CloseIcon } from "@chakra-ui/icons";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Container,
  Flex,
  Heading,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Spinner,
  Text,
  useBoolean,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { formatFixed } from "@ethersproject/bignumber";
import { Chain, prepareWriteContract, writeContract } from "@wagmi/core";
import { BigNumber } from "ethers";
import { useState } from "react";
import { Address } from "wagmi";
import Bridge from "../abi/Bridge.json";
import { deployment } from "../utils/consts&enums";
import type { ClaimStruct, TokenData, TxStruct } from "../utils/types";
type ClaimProps = {
  userClaims: ClaimStruct[];
  claimsAreFetching: boolean;
  currentChain: Chain;
  targetChain: Chain;
  chains: Chain[];
  availableChains: Chain[];
  currentAddress: Address;
  isNetworkSwitching: boolean;
  getTokenData: (
    tokenAddress: Address,
    chainId?: number
  ) => Promise<TokenData | null>;
  handleNetworkSwitch: () => void;
};
const ClaimView = ({
  userClaims,
  claimsAreFetching,
  currentChain,
  targetChain,
  chains,
  availableChains,
  currentAddress,
  isNetworkSwitching,
  getTokenData,
  handleNetworkSwitch,
}: ClaimProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [networkSwitcher, setNetworkSwitcher] = useState<number>(-1);
  const [currentClaim, setCurrentClaim] = useState<number>(-1);

  const [tokenClaimed, tokenClaim] = useBoolean();
  const [inClaim, claimProcess] = useBoolean();
  const [claimTx, setClaimTx] = useState<TxStruct>({
    data: "",
    err: "",
  });
  const [wrappedToken, setWrappedToken] = useState<TokenData>();

  // MODAL
  const handleCloseModal = () => {
    setClaimTx({ data: "", err: "" });
    claimProcess.off();
    tokenClaim.off();
  };

  const bytes32ToAddress = (address: string) => {
    console.log("bytes32 string", address);
    console.log(
      "address string",
      "0x" + address.substring(address.length - 40)
    );
    return ("0x" + address.substring(address.length - 40)) as Address;
  };

  const withdraw = async (
    sourceToken: Address,
    sourceTokenSymbol: string,
    sourceTokenName: string,
    isSourceTokenPermit: boolean,
    amount: BigNumber,
    signature: string
  ) => {
    try {
      const config = await prepareWriteContract({
        address: deployment.bridge,
        abi: Bridge.abi,
        functionName: "withdraw",
        args: [
          sourceToken,
          sourceTokenSymbol,
          sourceTokenName,
          isSourceTokenPermit,
          amount,
          signature,
        ],
      });

      const tx = await writeContract(config);
      setClaimTx({ data: tx.hash, err: "" });

      const reciept = await tx.wait();
      console.log("reciept.logs", reciept.logs);

      const wrappedToken = await getTokenData(
        bytes32ToAddress(
          BigNumber.from(reciept.logs[0].topics[2]).isZero()
            ? reciept.logs[3].topics[3]
            : reciept.logs[0].topics[2]
        )
      );

      if (!wrappedToken) throw new Error();

      setWrappedToken(wrappedToken);
      console.log("wrapped token", wrappedToken);
    } catch (e) {
      setClaimTx({ data: "", err: (e as Error).message });
      throw new Error();
    }
  };

  const handleClaimClick = async (claim: ClaimStruct) => {
    try {
      claimProcess.on();
      tokenClaim.off();

      const response = await fetch("/api/v1/createWithdrawRequest", {
        method: "POST",
        body: JSON.stringify({
          from: currentAddress,
          amount: claim.amount.toString(),
          sourceToken: claim.token.address,
          chainId: currentChain.id,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const { sourceTokenSymbol, sourceTokenName, isSourceTokenPermit, sig } =
        await response.json();

      await withdraw(
        claim.token.address as Address,
        sourceTokenSymbol,
        sourceTokenName,
        isSourceTokenPermit,
        claim.amount,
        sig
      );
      tokenClaim.on();
    } catch (error) {
      console.log(error);
    }
  };
  const handleAddToMetaMaskClick = async () => {
    try {
      const wasAdded = window.ethereum?.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: wrappedToken?.address as Address, // The address that the token is at.
            symbol: wrappedToken?.symbol as string, // A ticker symbol or shorthand, up to 5 chars.
            decimals: wrappedToken?.decimals as number, // The number of decimals in the token
          },
        },
      });
      if (wasAdded) {
        console.log("Thanks for your interest!");
      } else {
        console.log("Your loss!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Container maxWidth="5xl" mb="8" textAlign="center">
      {claimsAreFetching ? (
        <Flex justifyContent="center" alignItems="center">
          <Text mr="10">Fetching claims</Text>
          <Spinner size="xl" />
        </Flex>
      ) : userClaims?.length > 0 ? (
        <SimpleGrid columns={1} spacing={10}>
          {userClaims.map((claim, index) => (
            <Card
              key={index}
              flexBasis="80%"
              filter={claim.isClaimed ? "grayscale(80%)" : ""}
            >
              <CardHeader
                pb="2"
                borderBottom="4px solid"
                borderColor="teal.200"
                fontWeight={600}
                textColor="gray.500"
              >
                <Flex
                  direction="row"
                  justifyContent="space-between"
                  align="center"
                >
                  <Text fontSize="md" flexBasis="40%" textAlign="center">
                    Token address
                  </Text>
                  <Text fontSize="md" flexBasis="10%" textAlign="center">
                    Symbol
                  </Text>
                  <Text fontSize="md" flexBasis="15%" textAlign="center">
                    From
                  </Text>
                  <Text fontSize="md" flexBasis="15%" textAlign="center">
                    To
                  </Text>
                  <Text fontSize="md" flexBasis="20%" textAlign="center">
                    Amount
                  </Text>
                </Flex>
              </CardHeader>
              <CardBody borderBottom="1.5px solid" borderColor="teal.200">
                <Flex
                  direction="row"
                  justifyContent="space-between"
                  align="center"
                >
                  <Text fontSize="md" flexBasis="40%" textAlign="left">
                    {claim.token.address}
                  </Text>
                  <Text fontSize="md" flexBasis="10%" textAlign="center">
                    {claim.token.symbol}
                  </Text>
                  <Text fontSize="md" flexBasis="15%" textAlign="center">
                    {chains.find((ch) => ch.id === claim.sourceChainId)?.name}
                  </Text>
                  <Text fontSize="md" flexBasis="15%" textAlign="center">
                    {chains.find((ch) => ch.id === claim.targetChainId)?.name}
                  </Text>
                  <Text fontSize="md" flexBasis="20%" textAlign="center">
                    {formatFixed(claim.amount, claim.token.decimals)}
                  </Text>
                </Flex>
              </CardBody>
              <CardFooter justifyContent="center" py="2">
                <Button
                  colorScheme="teal"
                  variant="solid"
                  onClick={async () => {
                    setCurrentClaim(index);
                    onOpen();
                    handleClaimClick(claim);
                  }}
                  isLoading={inClaim && currentClaim == index}
                  mr="4"
                  isDisabled={
                    currentChain?.id !== claim.targetChainId ||
                    tokenClaimed ||
                    claim.isClaimed
                  }
                >
                  {tokenClaimed || claim.isClaimed ? "Claimed" : "Claim"}
                </Button>
                <Button
                  colorScheme="teal"
                  variant="outline"
                  onClick={() => {
                    setNetworkSwitcher(index);
                    handleNetworkSwitch();
                  }}
                  isLoading={isNetworkSwitching && networkSwitcher == index}
                  ml="4"
                  isDisabled={
                    currentChain?.id === claim.targetChainId || claim.isClaimed
                  }
                >
                  Switch network
                </Button>
              </CardFooter>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <Text mr="10">No available claims</Text>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          handleCloseModal();
        }}
        isCentered
        size="3xl"
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign="center">Claiming</ModalHeader>
          {(claimTx.err || tokenClaimed) && <ModalCloseButton />}
          <ModalBody>
            <Card mb="3">
              <CardBody>
                <Flex justifyContent="space-between" alignItems="center">
                  <Heading fontSize="3xl">Claim</Heading>
                  {tokenClaimed ? (
                    <CheckIcon boxSize="8" />
                  ) : claimTx.err ? (
                    <CloseIcon boxSize="8" />
                  ) : (
                    <Spinner boxSize="8" />
                  )}
                </Flex>
                {claimTx.err && (
                  <Text color="red" fontSize="small">
                    Tx data: {claimTx.err}
                  </Text>
                )}
                {claimTx.data && (
                  <Link
                    fontSize="small"
                    color="teal.500"
                    href={`${currentChain.blockExplorers?.default.url}/tx/${claimTx.data}`}
                    isExternal
                  >
                    Tx data: {claimTx.data}
                  </Link>
                )}
              </CardBody>
              {tokenClaimed && (
                <>
                  <CardFooter justifyContent="center">
                    <VStack>
                      <Text>{wrappedToken?.symbol} is claimed!</Text>
                      <Button onClick={handleAddToMetaMaskClick}>
                        Add {wrappedToken?.symbol} to MetaMask
                      </Button>
                    </VStack>
                  </CardFooter>
                </>
              )}
            </Card>
          </ModalBody>

          <ModalFooter></ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default ClaimView;
