import {
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useBoolean,
} from "@chakra-ui/react";
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
  getContract,
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
import { addresses, TokenType } from "../utils/consts&enums";
import type {
  TokenData,
  UserTokenData,
  DepositStruct,
  ClaimStruct,
  TokenInfo,
} from "../utils/types";

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
  const { chain: currentChain } = useNetwork();
  const {
    error,
    isLoading: isNetworkSwitching,
    switchNetwork,
  } = useSwitchNetwork();
  const bridgeContract = useContract({
    address:
      addresses[currentChain?.id as number]?.bridge ?? constants.AddressZero,
    abi: Bridge.abi,
    signerOrProvider: provider({ chainId: currentChain?.id }),
  });
  const erc20SafeContract = useContract({
    address:
      addresses[currentChain?.id as number]?.erc20safe ?? constants.AddressZero,
    abi: ERC20Safe.abi,
    signerOrProvider: provider({ chainId: currentChain?.id }),
  });
  const [availableChains, setAvailableChains] = useState<Chain[]>(
    chains.filter((ch) => ch.id !== currentChain?.id)
  );
  const [targetChain, setTargetChain] = useState<Chain>(availableChains[0]);
  const [userTokens, setUserTokens] = useState<UserTokenData[]>([]);
  const [userDeposits, setDeposits] = useState<DepositStruct[]>([]);
  const [userClaims, setClaims] = useState<ClaimStruct[]>([]);

  const [depositsAreFetching, fetchingDeposits] = useBoolean();
  const [claimsAreFetching, fetchingClaims] = useBoolean();

  useEffect(() => {
    fetchClaims();
  }, [currentChain?.id, userDeposits]);
  useEffect(() => {
    fetchDepositedTokens();
  }, [currentChain?.id]);
  useEffect(() => {
    async function initValidator() {
      await setValidator(provider({ chainId: currentChain?.id }));
    }
    initValidator();
  }, [currentChain?.id]);
  useEffect(() => {
    getUserTokens();
  }, [account.address, currentChain?.id]);
  useEffect(() => {
    function trackAvailableChains() {
      let updatedChains: Chain[] = [];
      currentChain &&
        (updatedChains = chains.filter((ch) => ch.id !== currentChain?.id));

      setAvailableChains(updatedChains);
      setTargetChain(updatedChains[0]);
    }
    trackAvailableChains();
  }, [currentChain?.id]);

  useContractEvent({
    address: addresses[currentChain?.id as number].bridge,
    abi: Bridge.abi,
    eventName: "Deposit",
    async listener(depositer, tokenAddress, _) {
      await updateDeposits(depositer as Address, tokenAddress as Address);
    },
  });
  useContractEvent({
    address: addresses[currentChain?.id as number].bridge,
    abi: Bridge.abi,
    eventName: "Release",
    async listener(releaser, tokenAddress, _) {
      await updateDeposits(releaser as Address, tokenAddress as Address);
    },
  });
  useContractEvent({
    address: addresses[targetChain?.id as number].bridge,
    abi: Bridge.abi,
    eventName: "Burn",
    async listener(burner, wrappedToken, sourceToken, amount) {
      console.log("wrapped token", wrappedToken);
    },
  });
  useContractEvent({
    address: addresses[targetChain?.id as number].bridge,
    abi: Bridge.abi,
    eventName: "Withdraw",
    async listener(withdrawer, sourceToken, wrappedToken, amount) {
      //console.log("wrapped token", wrappedToken);
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

  const fetchDepositedTokens = async () => {
    fetchingDeposits.on();

    const depositFilter = bridgeContract?.filters.Deposit(
      account.address
    ) as EventFilter;
    let depositEvents = await bridgeContract?.queryFilter(depositFilter);

    const depositedTokenAddresses = depositEvents
      ?.map((event) => event.args?.[1] ?? constants.AddressZero)
      .filter(
        (address, index, self) =>
          self.indexOf(address) === index && address !== constants.AddressZero
      ) as Address[];

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
    setDeposits(tokenDeposits);

    fetchingDeposits.off();
  };
  const fetchClaims = async () => {
    fetchingClaims.on();

    let claims: ClaimStruct[] = [];
    for (const chain of chains) {
      const bridgeContract = getContract({
        address: addresses[chain.id].bridge,
        abi: Bridge.abi,
        signerOrProvider: provider({ chainId: chain.id }),
      });

      const depositFilterByOwner = bridgeContract?.filters.Deposit(
        account.address
      ) as EventFilter;
      let depositEvents = await bridgeContract?.queryFilter(
        depositFilterByOwner
      );

      const depositedTokenAddresses = depositEvents
        ?.map((event) => event.args?.token ?? constants.AddressZero)
        .filter(
          (address, index, self) =>
            self.indexOf(address) === index && address !== constants.AddressZero
        ) as Address[];

      for (const token of depositedTokenAddresses) {
        const depositedAmount = await getDepositedAmount(token, chain.id);
        const tokenData = await getTokenData(token, chain.id);

        const { isClaimed, availableToClaim } = await isTokenClaimed(
          token,
          chain
        );

        if (!BigNumber.from(depositedAmount).isZero()) {
          claims.push({
            claimId: claims.length,
            token: tokenData,
            amount: availableToClaim,
            sourceChainId: chain.id,
            targetChainId: chains.find((ch) => ch.id !== chain.id)
              ?.id as number,
            isClaimed: isClaimed,
          });
        }
      }
    }
    setClaims(claims);

    fetchingClaims.off();
  };
  const isTokenClaimed = async (token: Address, chain: Chain) => {
    // SOURCE CHAIN
    const bridgeContract = getContract({
      address: addresses[chain.id].bridge,
      abi: Bridge.abi,
      signerOrProvider: provider({
        chainId: chain.id,
      }),
    });
    const depositFilterByOwnerAndToken = bridgeContract?.filters.Deposit(
      account.address,
      token
    ) as EventFilter;
    let depositEvents = await bridgeContract?.queryFilter(
      depositFilterByOwnerAndToken
    );

    const releaseFilterByOwnerAndToken = bridgeContract?.filters.Release(
      account.address,
      token
    ) as EventFilter;
    let releaseEvents = await bridgeContract?.queryFilter(
      releaseFilterByOwnerAndToken
    );
    const allDeposits = depositEvents?.reduce(
      (temp, evt) => temp.add(evt.args?.amount),
      BigNumber.from(0)
    ) as BigNumber;

    const allReleases = releaseEvents?.reduce(
      (temp, evt) => temp.add(evt.args?.amount),
      BigNumber.from(0)
    ) as BigNumber;

    const sourceChainAmount = allDeposits.sub(allReleases);

    console.log("allDeposits", formatFixed(allDeposits, 18));
    console.log("allReleases", formatFixed(allReleases, 18));

    // TARGET CHAIN
    const targetChain = chains.find((ch) => ch.id !== chain.id) as Chain;
    const targetBridgeContract = getContract({
      address: addresses[targetChain.id].bridge,
      abi: Bridge.abi,
      signerOrProvider: provider({
        chainId: targetChain.id,
      }),
    });

    const burnFilterByOwnerAndToken = targetBridgeContract?.filters.Burn(
      account.address,
      null,
      token
    ) as EventFilter;
    let burnEvents = await targetBridgeContract?.queryFilter(
      burnFilterByOwnerAndToken
    );

    const withdrawFilterByOwnerAndToken =
      targetBridgeContract?.filters.Withdraw(
        account.address,
        token
      ) as EventFilter;
    let withdrawEvents = await targetBridgeContract?.queryFilter(
      withdrawFilterByOwnerAndToken
    );

    const allBurns = burnEvents?.reduce(
      (temp, evt) => temp.add(evt.args?.amount),
      BigNumber.from(0)
    );

    const allWithdrawals = withdrawEvents?.reduce(
      (temp, evt) => temp.add(evt.args?.amount),
      BigNumber.from(0)
    );

    const targetChainAmount = allWithdrawals.sub(allBurns);
    console.log("allBurns", formatFixed(allBurns, 18));
    console.log("allWithdrawals", formatFixed(allWithdrawals, 18));

    console.log("sourceChainAmount", formatFixed(sourceChainAmount, 18));
    console.log("targetChainAmount", formatFixed(targetChainAmount, 18));

    return {
      isClaimed: targetChainAmount.gte(sourceChainAmount),
      availableToClaim: targetChainAmount.gte(sourceChainAmount)
        ? targetChainAmount
        : sourceChainAmount.sub(targetChainAmount),
    };
  };
  const getDepositedAmount = async (
    tokenAddress: Address,
    chainId?: number
  ) => {
    const data = await readContract({
      address: addresses[chainId || (currentChain?.id as number)].erc20safe,
      abi: ERC20Safe.abi,
      functionName: "getDepositedAmount",
      args: [account.address, tokenAddress],
      chainId: chainId || currentChain?.id,
    });

    return data as BigNumber;
  };
  const getTokenData = async (tokenAddress: Address, chainId?: number) => {
    const token = await fetchToken({
      address: tokenAddress,
      chainId: chainId || currentChain?.id,
    });

    const tokenInfo = (await readContract({
      address: addresses[chainId || (currentChain?.id as number)].erc20safe,
      abi: ERC20Safe.abi,
      functionName: "getTokenInfo",
      args: [tokenAddress],
      chainId: chainId || currentChain?.id,
    })) as TokenInfo;

    return { ...token, tokenInfo } as TokenData;
  };
  const getUserTokens = async () => {
    const tokens = await alchemy
      .forNetwork(networks[currentChain?.id as number])
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
    }
  };
  const updateClaims = async (owner: Address, tokenAddress: Address) => {
    if (owner === account.address) {
      const claimIndex = userClaims.findIndex(
        (claim) => claim.token.address === tokenAddress
      );

      const depositedAmount = await getDepositedAmount(tokenAddress as Address);
      const tokenData = await getTokenData(tokenAddress as Address);

      const updatedDeposits =
        claimIndex === -1
          ? [
              ...userClaims,
              {
                token: tokenData,
                amount: depositedAmount,
              } as DepositStruct,
            ]
          : userDeposits.map((deposit, index) => {
              if (claimIndex === index) deposit.amount = depositedAmount;
              return deposit;
            });

      // updatedDeposits.sort((deposit, nextDeposit) =>
      //   nextDeposit.amount.sub(deposit.amount).toNumber()
      // );

      setDeposits(
        updatedDeposits.filter((deposit) => !deposit.amount.isZero())
      );
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
                depositsAreFetching={depositsAreFetching}
                getTokenData={getTokenData}
                getDepositedAmount={getDepositedAmount}
                getUserTokens={getUserTokens}
                userClaims={userClaims}
                handleChainSelect={handleChainSelect}
              />
            </TabPanel>
            <TabPanel>
              <ClaimView
                userClaims={userClaims}
                claimsAreFetching={claimsAreFetching}
                currentChain={currentChain as Chain}
                targetChain={targetChain as Chain}
                chains={chains}
                availableChains={chains}
                currentAddress={account.address as Address}
                isNetworkSwitching={isNetworkSwitching}
                getTokenData={getTokenData}
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
