import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Container,
  Divider,
  Flex,
  Heading,
  Text,
} from "@chakra-ui/react";
import { formatFixed } from "@ethersproject/bignumber";
import {
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
} from "wagmi";
import { goerli, hardhat, polygonMumbai } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import Bridge from "../abi/Bridge.json";
import ERC20Safe from "../abi/ERC20Safe.json";
import DepositReleaseButton from "../components/Buttons/DepositReleaseButton";
import AmountCard from "../components/Cards/AmountCard";
import BridgeCard from "../components/Cards/BridgeCard";
import TokenCard from "../components/Cards/TokenCard";
import {
  setValidator,
  createReleaseRequest,
  signReleaseRequest,
} from "../utils/validator";

type Address = `0x${string}`;
type TokenData = Omit<FetchTokenResult, "totalSupply">;
type DepositStruct = {
  token: TokenData;
  amount: string;
};

const DepositView = () => {
  const bridgeAddress: Address = "0xce56e2D1e03e653bc95F113177A2Be6002068B7E";
  const erc20SafeAddress: Address =
    "0x268653b20B3a3aE011A42d2b0D6b9F97eC42ca2d";

  const { provider } = configureChains(
    [goerli, polygonMumbai, hardhat],
    [publicProvider()]
  );

  const { isConnected, address: currentAddress } = useAccount();
  const { chain, chains } = useNetwork();

  const bridgeContract = useContract({
    address: bridgeAddress,
    abi: Bridge.abi,
    signerOrProvider: provider({ chainId: chain?.id }),
  });

  const [targetChain, setTargetChain] = useState<number>();
  const [token, setToken] = useState<Address>(
    "0x025F22Ccbe9FCEbC4dFC359E36051498eC8c9c3F"
  );
  const [amount, setAmount] = useState<BigNumber>(parseEther("5"));
  const [zerosAmount, setZerosAmount] = useState<number>(0);
  const [deposits, setDeposits] = useState<DepositStruct[]>([]);
  const [depositIsProcessing, startDepositProcess] = useState<boolean>(false);
  const [releaseIsProcessing, startReleaseProcess] = useState<boolean>(false);

  const getDepositedAmount = async (tokenAddress: Address) => {
    const data = await readContract({
      address: erc20SafeAddress,
      abi: ERC20Safe.abi,
      functionName: "getDepositedAmount",
      args: [currentAddress, tokenAddress],
    });

    return data as string;
  };
  const getTokenData = async (tokenAddress: Address) => {
    const token = await fetchToken({
      address: tokenAddress,
    });

    return token as TokenData;
  };
  const updateDeposits = async (owner: Address, tokenAddress: Address) => {
    if (owner === currentAddress) {
      const depositIndex = deposits.findIndex(
        (deposit) => deposit.token.address === tokenAddress
      );

      const depositedAmount = await getDepositedAmount(tokenAddress as Address);
      const tokenData = await getTokenData(tokenAddress as Address);

      const updatedDeposits =
        depositIndex === -1
          ? [
              ...deposits,
              {
                token: tokenData,
                amount: formatFixed(depositedAmount, tokenData.decimals),
              } as DepositStruct,
            ]
          : deposits.map((deposit, index) => {
              if (depositIndex === index)
                deposit.amount = formatFixed(
                  depositedAmount,
                  tokenData.decimals
                );
              return deposit;
            });

      // updatedDeposits.sort((deposit, nextDeposit) =>
      //   nextDeposit.amount.sub(deposit.amount).toNumber()
      // );

      setDeposits(updatedDeposits.filter((deposit) => deposit.amount != "0.0"));

      console.log("useContractEvent: Token Deposits", deposits);
    }
  };

  useEffect(() => {
    async function fetchDepositedTokens() {
      const depositFilter = bridgeContract?.filters.Deposit(
        currentAddress
      ) as EventFilter;
      let depositEvents = await bridgeContract?.queryFilter(depositFilter);

      console.log("useEffect: Deposit events", depositEvents);

      const depositedTokenAddresses = depositEvents
        ?.map((event) => event.args?.[1] ?? constants.AddressZero)
        .filter(
          (address, index, self) =>
            self.indexOf(address) === index && address !== constants.AddressZero
        ) as Address[];

      console.log(
        "useEffect: Filtered deposited tokens",
        depositedTokenAddresses
      );

      let tokenDeposits: DepositStruct[] = [];
      for (const token of depositedTokenAddresses) {
        const depositedAmount = await getDepositedAmount(token);
        const tokenData = await getTokenData(token);

        if (!BigNumber.from(depositedAmount).isZero()) {
          tokenDeposits.push({
            token: tokenData,
            amount: formatFixed(depositedAmount, tokenData.decimals),
          });
        }
      }

      // tokenDeposits.sort((deposit, nextDeposit) =>
      //   nextDeposit.amount.sub(deposit.amount).toNumber()
      // );

      console.log("useEffect: Token deposits", tokenDeposits);

      setDeposits(tokenDeposits);
    }
    fetchDepositedTokens();
  }, []);

  const handleChainSelect = (e: BaseSyntheticEvent) => {
    setTargetChain(Number(e.target.value));
  };
  const handleTokenInput = (e: BaseSyntheticEvent) => {
    setToken(e.target.value);
  };
  const handleAmountInput = (e: BaseSyntheticEvent) => {
    setZerosAmount(0);
    setAmount(BigNumber.from(e.target.value));
  };
  const handleAddZerosAmountClick = () => {
    setZerosAmount(zerosAmount < 18 ? zerosAmount + 6 : 0);
    setAmount(BigNumber.from(`1`.padEnd(zerosAmount + 1, "0")));
  };

  useContractEvent({
    address: bridgeAddress,
    abi: Bridge.abi,
    eventName: "Deposit",
    async listener(depositer, tokenAddress, _) {
      await updateDeposits(depositer as Address, tokenAddress as Address);
    },
  });
  useContractEvent({
    address: bridgeAddress,
    abi: Bridge.abi,
    eventName: "Release",
    async listener(releaser, tokenAddress, _) {
      await updateDeposits(releaser as Address, tokenAddress as Address);
    },
  });

  const getApproval = async () => {
    const approval = await readContract({
      address: token,
      abi: erc20ABI,
      functionName: "allowance",
      args: [currentAddress as Address, erc20SafeAddress],
    });

    return approval as BigNumber;
  };

  const approve = async () => {
    const config = await prepareWriteContract({
      address: token,
      abi: erc20ABI,
      functionName: "approve",
      args: [erc20SafeAddress, constants.MaxUint256],
    });

    await writeContract(config);
  };

  const deposit = async () => {
    const config = await prepareWriteContract({
      address: bridgeAddress,
      abi: Bridge.abi,
      functionName: "deposit",
      args: [token, amount],
    });

    await writeContract(config);
  };

  const release = async (signature: string) => {
    const config = await prepareWriteContract({
      address: bridgeAddress,
      abi: Bridge.abi,
      functionName: "release",
      args: [token, amount, signature],
    });
    const { hash } = await writeContract(config);
  };

  const handleDepositClick = async () => {
    try {
      startDepositProcess(true);
      const approval = await getApproval();
      if (approval?.lt(amount)) await approve();

      await deposit();
    } catch (error) {
      console.log((error as Error).message);
    } finally {
      startDepositProcess(false);
    }
  };
  const handleRelease = async () => {
    try {
      startReleaseProcess(true);
      await setValidator(provider({ chainId: chain?.id }));
      const req = await createReleaseRequest(
        currentAddress as Address,
        amount,
        token
      );
      const sig = await signReleaseRequest(req);

      await release(sig);
    } catch (error) {
      console.log((error as Error).message);
    } finally {
      startReleaseProcess(false);
    }
  };

  return (
    <>
      <Container maxWidth="5xl" mb="8">
        <BridgeCard
          availableChains={chains}
          onChainSelect={handleChainSelect}
        />
        <TokenCard address={token} setToken={handleTokenInput} />
        <AmountCard
          amount={amount.toString()}
          setAmount={handleAmountInput}
          zerosAmount={zerosAmount}
          setZerosAmount={handleAddZerosAmountClick}
        />
        <DepositReleaseButton
          deposit={handleDepositClick}
          release={handleRelease}
          depositLoading={depositIsProcessing}
          releaseLoading={releaseIsProcessing}
        />
      </Container>

      <Divider />

      <Accordion allowToggle>
        <AccordionItem>
          <h2>
            <AccordionButton>Show deposited tokens</AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Flex direction="column">
              <Divider my="4" />
              <Flex direction="row" justifyContent="space-between">
                <Heading fontSize="md" flexBasis="40%" textAlign="left">
                  Address
                </Heading>
                <Heading fontSize="md" flexBasis="20%" textAlign="center">
                  Symbol
                </Heading>
                <Heading fontSize="md" flexBasis="40%" textAlign="right">
                  Amount
                </Heading>
              </Flex>
              <Divider my="4" />
              {deposits.map((deposit, index) => (
                <Flex
                  key={index}
                  direction="row"
                  justifyContent="space-between"
                >
                  <Text fontSize="md" flexBasis="40%" textAlign="left">
                    {deposit.token.address}
                  </Text>
                  <Text fontSize="md" flexBasis="20%" textAlign="center">
                    {deposit.token.symbol}
                  </Text>
                  <Text fontSize="md" flexBasis="40%" textAlign="right">
                    {deposit.amount}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </>
  );
};

export default DepositView;
