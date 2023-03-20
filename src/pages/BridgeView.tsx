import { Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import alchemy from "../utils/alchemy/alchemy";
import ClaimView from "./ClaimView";
import DepositView from "./DepositView";
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
  Chain,
  fetchToken,
  FetchTokenResult,
  prepareWriteContract,
  readContract,
  writeContract,
  ProviderWithFallbackConfig,
  switchNetwork,
} from "@wagmi/core";
import { BigNumber, constants, EventFilter, providers } from "ethers";
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
  useSwitchNetwork,
} from "wagmi";
import { goerli, hardhat, polygonMumbai, sepolia } from "wagmi/chains";
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
  signWithdrawalRequest,
} from "../utils/validator";
import { Alchemy, Network, AssetTransfersCategory } from "alchemy-sdk";
import { alchemyProvider } from "wagmi/providers/alchemy";
import networks from "../utils/networksDict";
import { addresses } from "../utils/consts&enums";
import type { TokenData, UserTokenData, DepositStruct } from "../utils/types";

type BridgeProps = {
  provider: ({ chainId }: { chainId?: number | undefined }) => (
    | providers.FallbackProvider
    | ProviderWithFallbackConfig<providers.StaticJsonRpcProvider>
  ) & {
    chains: Chain[];
  };
  chains: Chain[];
};
function BridgeView({ provider, chains }: BridgeProps) {
  const account = useAccount();
  const { chain } = useNetwork();
  const {
    error,
    isLoading: isNetworkSwitching,
    switchNetwork,
  } = useSwitchNetwork();

  const bridgeContract = useContract({
    address: addresses[chain?.id as number]?.bridge ?? constants.AddressZero,
    abi: Bridge.abi,
    signerOrProvider: provider({ chainId: chain?.id }),
  });

  const [availableChains, setAvailableChains] = useState<Chain[]>([]);
  const [targetChain, setTargetChain] = useState<Chain>(availableChains[0]);
  const [userTokens, setUserTokens] = useState<UserTokenData[]>([]);
  const [userDeposits, setDeposits] = useState<DepositStruct[]>([]);

  useEffect(() => {
    async function fetchDepositedTokens() {
      const depositFilter = bridgeContract?.filters.Deposit(
        account.address
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
            amount: depositedAmount,
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
  useEffect(() => {
    async function initValidator() {
      await setValidator(provider({ chainId: chain?.id }));
    }
    initValidator();
  }, []);
  useEffect(() => {
    getUserTokens();
  }, [account.address, chain?.id]);
  useEffect(() => {
    function trackAvailableChains() {
      let updatedChains: Chain[] = [];
      chain && (updatedChains = chains.filter((ch) => ch.id !== chain?.id));

      setAvailableChains(updatedChains);
      setTargetChain(updatedChains[0]);
    }
    trackAvailableChains();
  }, [chain?.id]);

  useContractEvent({
    address: addresses[chain?.id as number].bridge,
    abi: Bridge.abi,
    eventName: "Deposit",
    async listener(depositer, tokenAddress, _) {
      await updateDeposits(depositer as Address, tokenAddress as Address);
    },
  });
  useContractEvent({
    address: addresses[chain?.id as number].bridge,
    abi: Bridge.abi,
    eventName: "Release",
    async listener(releaser, tokenAddress, _) {
      await updateDeposits(releaser as Address, tokenAddress as Address);
    },
  });
  useContractEvent({
    address: addresses[chain?.id as number].bridge,
    abi: Bridge.abi,
    eventName: "Withdraw",
    async listener(withdrawer, sourceToken, wrappedToken, amount) {
      console.log(withdrawer, sourceToken, wrappedToken, amount);
    },
  });

  const handleChainSelect = (e: BaseSyntheticEvent) => {
    const selectedChain = chains.find(
      (chain) => chain.id == Number(e.target.value)
    ) as Chain;
    setTargetChain(selectedChain);
  };
  const handleNetworkSwitch = () => {
    switchNetwork?.(targetChain.id);
  };

  const getDepositedAmount = async (tokenAddress: Address) => {
    const data = await readContract({
      address: addresses[chain?.id as number].erc20safe,
      abi: ERC20Safe.abi,
      functionName: "getDepositedAmount",
      args: [account.address, tokenAddress],
    });

    return data as BigNumber;
  };
  const getTokenData = async (tokenAddress: Address) => {
    console.log("current chain id", chain?.id);
    const token = await fetchToken({
      address: tokenAddress,
      chainId: chain?.id,
    });

    return token as TokenData;
  };
  const getUserTokens = async () => {
    const tokens = await alchemy
      .forNetwork(networks[chain?.id as number])
      .core.getTokenBalances(account.address as string);

    const userTokens: UserTokenData[] = [];
    for (const token of tokens.tokenBalances) {
      if (!BigNumber.from(token.tokenBalance).isZero()) {
        const userToken = {
          ...(await getTokenData(token.contractAddress as Address)),
          userBalance: token.tokenBalance,
        } as UserTokenData;

        userTokens.push(userToken);
      }
    }
    setUserTokens(userTokens);
  };
  const updateDeposits = async (owner: Address, tokenAddress: Address) => {
    if (owner === account.address) {
      const depositIndex = userDeposits.findIndex(
        (deposit) => deposit.token.address === tokenAddress
      );

      const depositedAmount = await getDepositedAmount(tokenAddress as Address);
      const tokenData = await getTokenData(tokenAddress as Address);

      const updatedDeposits =
        depositIndex === -1
          ? [
              ...userDeposits,
              {
                token: tokenData,
                amount: depositedAmount,
              } as DepositStruct,
            ]
          : userDeposits.map((deposit, index) => {
              if (depositIndex === index) deposit.amount = depositedAmount;
              return deposit;
            });

      // updatedDeposits.sort((deposit, nextDeposit) =>
      //   nextDeposit.amount.sub(deposit.amount).toNumber()
      // );

      setDeposits(
        updatedDeposits.filter((deposit) => !deposit.amount.isZero())
      );

      console.log("useContractEvent: Token Deposits", userDeposits);
    }
  };

  return (
    <div className="bridge">
      {account.isConnected && (
        <Tabs isFitted>
          <TabList>
            <Tab>Deposit</Tab>
            <Tab>Claim</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <DepositView
                alchemy={alchemy}
                availableChains={availableChains}
                currentUserAddress={account.address as Address}
                userTokens={userTokens}
                userDeposits={userDeposits}
                currentChain={chain as Chain}
                getTokenData={getTokenData}
                getUserTokens={getUserTokens}
                handleChainSelect={handleChainSelect}
              />
            </TabPanel>
            <TabPanel>
              <ClaimView
                userDeposits={userDeposits}
                currentChain={chain as Chain}
                targetChain={targetChain as Chain}
                availableChains={chains}
                currentAddress={account.address as Address}
                isNetworkSwitching={isNetworkSwitching}
                handleNetworkSwitch={handleNetworkSwitch}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </div>
  );
}

export default BridgeView;
