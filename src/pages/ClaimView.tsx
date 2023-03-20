import {
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Container,
  HStack,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Divider,
  Flex,
  Heading,
} from "@chakra-ui/react";
import {
  Chain,
  fetchToken,
  FetchTokenResult,
  prepareWriteContract,
  readContract,
  writeContract,
} from "@wagmi/core";
import { BigNumber, constants, EventFilter } from "ethers";
import { parseEther } from "ethers/lib/utils.js";
import { BaseSyntheticEvent, useEffect, useState } from "react";
import {
  configureChains,
  erc20ABI,
  useAccount,
  useNetwork,
  useContract,
  useContractEvent,
  Address,
} from "wagmi";
import { goerli, hardhat, polygonMumbai } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import Bridge from "../abi/Bridge.json";
import ERC20Safe from "../abi/ERC20Safe.json";
import DepositReleaseButton from "../components/Buttons/DepositReleaseButton";
import AmountCard from "../components/Cards/AmountCard";
import BridgeCard from "../components/Cards/BridgeCard";
import TokenCard from "../components/Cards/TokenCard";
import { formatFixed } from "@ethersproject/bignumber";
import {
  setValidator,
  createReleaseRequest,
  signWithdrawalRequest,
  getWrappedToken,
  createWithdrawRequest,
} from "../utils/validator";
import type {
  UserTokenData,
  ValidationResult,
  TokenData,
  DepositStruct,
} from "../utils/types";
import { addresses } from "../utils/consts&enums";

type ClaimProps = {
  userDeposits: DepositStruct[];
  currentChain: Chain;
  targetChain: Chain;
  availableChains: Chain[];
  currentAddress: Address;
  isNetworkSwitching: boolean;
  handleNetworkSwitch: () => void;
};
const ClaimView = ({
  userDeposits,
  currentChain,
  targetChain,
  availableChains,
  currentAddress,
  isNetworkSwitching,
  handleNetworkSwitch,
}: ClaimProps) => {
  const [claimIsProcessing, startClaimProcess] = useState<boolean>(false);

  const withdraw = async (
    sourceToken: Address,
    amount: BigNumber,
    signature: string
  ) => {
    const config = await prepareWriteContract({
      address: addresses[currentChain.id].bridge,
      abi: Bridge.abi,
      functionName: "withdraw",
      args: [sourceToken, amount, signature],
    });
    const { hash } = await writeContract(config);
  };

  const handleClaimClick = async (deposit: DepositStruct) => {
    console.log("Claim deposit", deposit);
    try {
      startClaimProcess(true);
      const req = await createWithdrawRequest(
        currentAddress as Address,
        BigNumber.from(deposit.amount),
        deposit.token.address
      );

      const sig = await signWithdrawalRequest(req);

      await withdraw(
        deposit.token.address as Address,
        BigNumber.from(deposit.amount),
        sig
      );
    } catch (error) {
      console.log((error as Error).message);
    } finally {
      startClaimProcess(false);
    }
  };
  return (
    <Container maxWidth="5xl" mb="8">
      <SimpleGrid columns={1} spacing={10}>
        {userDeposits.map((deposit, index) => (
          <Card key={index} flexBasis="80%">
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
                  {deposit.token.address}
                </Text>
                <Text fontSize="md" flexBasis="10%" textAlign="center">
                  {deposit.token.symbol}
                </Text>
                <Text fontSize="md" flexBasis="15%" textAlign="center">
                  {currentChain?.name}
                </Text>
                <Text fontSize="md" flexBasis="15%" textAlign="center">
                  {targetChain?.name}
                </Text>
                <Text fontSize="md" flexBasis="20%" textAlign="center">
                  {formatFixed(deposit.amount, deposit.token.decimals)}
                </Text>
              </Flex>
            </CardBody>
            <CardFooter justifyContent="center" py="2">
              <Button
                colorScheme="teal"
                variant="solid"
                onClick={async () => await handleClaimClick(deposit)}
                isLoading={claimIsProcessing}
                mr="4"
              >
                Claim
              </Button>
              <Button
                colorScheme="teal"
                variant="outline"
                onClick={handleNetworkSwitch}
                isLoading={isNetworkSwitching}
                ml="4"
                isDisabled={currentChain?.id === targetChain?.id}
              >
                Switch network
              </Button>
            </CardFooter>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
};

export default ClaimView;
