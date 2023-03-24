import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useBoolean,
} from "@chakra-ui/react";
import { formatFixed } from "@ethersproject/bignumber";
import {
  Chain,
  fetchToken,
  getContract,
  getProvider,
  ProviderWithFallbackConfig,
  readContract,
} from "@wagmi/core";
import { BigNumber, constants, EventFilter, providers } from "ethers";
import { BaseSyntheticEvent, useEffect, useState } from "react";
import {
  Address,
  useAccount,
  useContract,
  useContractEvent,
  useNetwork,
  useProvider,
  useSwitchNetwork,
  useClient,
} from "wagmi";
import Bridge from "../abi/Bridge.json";
import ERC20Safe from "../abi/ERC20Safe.json";
import alchemy from "../utils/alchemy/alchemy";
import { deployment } from "../utils/consts&enums";
import { networksDictionary } from "../utils/networksDict";
import type {
  ClaimStruct,
  DepositStruct,
  TokenData,
  TokenInfo,
  UserTokenData,
} from "../utils/types";
import { setValidator } from "../utils/validator";
import ClaimView from "./ClaimView";
import DepositView from "./DepositView";

type BridgeProps = {
  configuredChains: Chain[];
};
function BridgeView({ configuredChains }: BridgeProps) {
  const provider = useProvider();
  const account = useAccount();

  const { chain: currentChain } = useNetwork();
  const networkSwitcher = useSwitchNetwork();

  const bridgeContract = useContract({
    address: deployment[currentChain?.id as number].bridge,
    abi: Bridge.abi,
    signerOrProvider: provider,
  });

  const [availableChains, setAvailableChains] = useState<Chain[]>(
    configuredChains.filter((ch) => ch.id !== currentChain?.id)
  );
  const [targetChain, setTargetChain] = useState<Chain>(availableChains[0]);

  const [userTokens, setUserTokens] = useState<UserTokenData[]>([]);
  const [userDeposits, setDeposits] = useState<DepositStruct[]>([]);
  const [userClaims, setClaims] = useState<ClaimStruct[]>([]);

  const [depositsAreFetching, fetchingDeposits] = useBoolean();
  const [claimsAreFetching, fetchingClaims] = useBoolean();

  useEffect(() => {
    fetchUserTokens();
    fetchDepositedTokens();
    fetchClaims();
  }, [account.address, currentChain]);
  useEffect(() => {
    function trackAvailableChains() {
      let updatedAvailableChains: Chain[] = [];
      currentChain &&
        (updatedAvailableChains = configuredChains.filter(
          (ch) => ch.id !== currentChain.id
        ));

      setAvailableChains(updatedAvailableChains);
      setTargetChain(updatedAvailableChains[0]);
    }
    trackAvailableChains();
  }, [currentChain]);
  useEffect(() => {
    async function initValidator() {
      await setValidator(provider);
    }
    initValidator();
  }, [currentChain]);

  useContractEvent({
    address: deployment[currentChain?.id as number].bridge,
    abi: Bridge.abi,
    eventName: "Deposit",
    async listener(_depositer, _tokenAddress, _amount) {
      const depositer = _depositer as string;
      const tokenAddress = _tokenAddress as string;
      const amount = _amount as string;

      await updateToken(depositer, tokenAddress);
      await updateDeposit(depositer, tokenAddress);
      await updateClaim(depositer, tokenAddress, amount);
    },
  });
  useContractEvent({
    address: deployment[currentChain?.id as number].bridge,
    abi: Bridge.abi,
    eventName: "Release",
    async listener(_releaser, _tokenAddress, _amount) {
      const releaser = _releaser as string;
      const tokenAddress = _tokenAddress as string;
      const amount = _amount as string;

      await updateToken(releaser, tokenAddress);
      await updateDeposit(releaser, tokenAddress);
      //await updateClaim(depositer, tokenAddress, amount);
    },
  });
  useContractEvent({
    address: deployment[targetChain?.id as number].bridge,
    abi: Bridge.abi,
    eventName: "Burn",
    async listener(burner, wrappedToken, sourceToken, amount) {
      // await updateToken(releaser, tokenAddress);
      // await updateDeposit(releaser, tokenAddress);
      //await updateClaim(depositer, tokenAddress, amount);
    },
  });
  useContractEvent({
    address: deployment[targetChain?.id as number].bridge,
    abi: Bridge.abi,
    eventName: "Withdraw",
    async listener(withdrawer, sourceToken, wrappedToken, amount) {
      // await updateToken(releaser, tokenAddress);
      // await updateDeposit(releaser, tokenAddress);
      //await updateClaim(depositer, tokenAddress, amount);
    },
  });

  const handleChainSelect = (e: BaseSyntheticEvent) => {
    const selectedChain = configuredChains.find(
      (chain) => chain.id == Number(e.target.value)
    ) as Chain;
    setTargetChain(selectedChain);
  };
  const handleNetworkSwitch = () => {
    networkSwitcher.switchNetwork?.(targetChain.id);
  };

  // TOKENS
  const fetchUserTokens = async () => {
    try {
      const tokens = await alchemy
        .forNetwork(networksDictionary[currentChain?.id as number])
        .core.getTokenBalances(account.address as string);

      const userTokens: UserTokenData[] = [];
      const nonZeroTokens = tokens.tokenBalances?.filter(
        (token) => !BigNumber.from(token.tokenBalance).isZero()
      );

      for (const token of nonZeroTokens) {
        const tokenData = await getTokenData(token.contractAddress as Address);

        if (tokenData) {
          const userToken = {
            ...tokenData,
            userBalance: token.tokenBalance,
          } as UserTokenData;

          userTokens.push(userToken);
        }
      }
      userTokens.sort((tok1, tok2) => {
        const balance1 = BigNumber.from(tok1.userBalance);
        const balance2 = BigNumber.from(tok2.userBalance);

        return balance1.gt(balance2) ? -1 : balance1.eq(balance2) ? 0 : 1;
      });
      setUserTokens(userTokens);
    } catch (err) {
      console.log("Error 'getUserTokens'", (err as Error).message);
    }
  };
  const updateToken = async (owner: string, tokenAddress: string) => {
    try {
      if (owner === account.address) {
        console.log("updating token...");
        const tokens = await alchemy
          .forNetwork(networksDictionary[currentChain?.id as number])
          .core.getTokenBalances(owner, [tokenAddress]);

        const currentToken = tokens.tokenBalances[0];

        let udpatedUserTokens: UserTokenData[] = [];
        if (!BigNumber.from(currentToken.tokenBalance).isZero()) {
          if (userTokens.length !== 0) {
            udpatedUserTokens = userTokens.map((token) => {
              if (
                token.address.toLowerCase() ===
                currentToken.contractAddress.toLowerCase()
              ) {
                token.userBalance = currentToken.tokenBalance as string;
              }
              return token;
            });
          } else {
            const tokenData = await getTokenData(currentToken.contractAddress);

            if (tokenData) {
              const userToken = {
                ...tokenData,
                userBalance: currentToken.tokenBalance,
              } as UserTokenData;

              udpatedUserTokens.push(userToken);
            }
          }
        } else {
          udpatedUserTokens = userTokens.filter(
            (token) =>
              token.address.toLowerCase() !==
              currentToken.contractAddress.toLowerCase()
          );
        }

        udpatedUserTokens.sort((tok1, tok2) => {
          const balance1 = BigNumber.from(tok1.userBalance);
          const balance2 = BigNumber.from(tok2.userBalance);

          return balance1.gt(balance2) ? -1 : balance1.eq(balance2) ? 0 : 1;
        });

        console.log("udpatedUserTokens", udpatedUserTokens);
        setUserTokens(udpatedUserTokens);
      }
    } catch (err) {
      console.log("Error 'updateToken'", (err as Error).message);
    }
  };
  const getTokenData = async (tokenAddress: string, chainId?: number) => {
    try {
      const token = await fetchToken({
        address: tokenAddress as Address,
        chainId: chainId || currentChain?.id,
      });

      const tokenInfo = (await readContract({
        address: deployment[chainId || (currentChain?.id as number)].erc20safe,
        abi: ERC20Safe.abi,
        functionName: "getTokenInfo",
        args: [tokenAddress],
        chainId: chainId || currentChain?.id,
      })) as TokenInfo;

      return { ...token, tokenInfo } as TokenData;
    } catch (err) {
      console.log("Error 'getTokenData'", (err as Error).message);
      return null;
    }
  };

  // DEPOSITS
  const fetchDepositedTokens = async () => {
    fetchingDeposits.on();

    const depositFilter = bridgeContract?.filters.Deposit(
      account.address
    ) as EventFilter;
    let depositEvents = await bridgeContract?.queryFilter(depositFilter);

    const depositedTokenAddresses = depositEvents
      ?.map((event) => event.args?.token ?? constants.AddressZero)
      .filter(
        (address, index, self) =>
          self.indexOf(address) === index && address !== constants.AddressZero
      ) as Address[];

    let tokenDeposits: DepositStruct[] = [];
    for (const token of depositedTokenAddresses) {
      const depositedAmount = await getDepositedAmount(token);
      const tokenData = await getTokenData(token);

      if (!BigNumber.from(depositedAmount).isZero() && tokenData) {
        tokenDeposits.push({
          token: tokenData,
          amount: depositedAmount,
        });
      }
    }

    tokenDeposits.sort((deposit, nextDeposit) =>
      deposit.amount.gt(nextDeposit.amount)
        ? -1
        : deposit.amount.eq(nextDeposit.amount)
        ? 0
        : 1
    );
    setDeposits(tokenDeposits);

    fetchingDeposits.off();
  };
  const updateDeposit = async (owner: string, tokenAddress: string) => {
    if (owner === account.address) {
      console.log("updating deposit...");
      const depositIndex = userDeposits.findIndex(
        (deposit) =>
          deposit.token.address.toLowerCase() === tokenAddress.toLowerCase()
      );

      const depositedAmount = await getDepositedAmount(tokenAddress as Address);
      const tokenData = await getTokenData(tokenAddress as Address);

      let updatedDeposits =
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

      updatedDeposits.sort((deposit, nextDeposit) =>
        deposit.amount.gt(nextDeposit.amount)
          ? -1
          : deposit.amount.eq(nextDeposit.amount)
          ? 0
          : 1
      );

      console.log(
        "updatedDeposits",
        updatedDeposits.filter((deposit) => !deposit.amount.isZero())
      );
      setDeposits(
        updatedDeposits.filter((deposit) => !deposit.amount.isZero())
      );
    }
  };
  const getDepositedAmount = async (
    tokenAddress: Address,
    chainId?: number
  ) => {
    const data = await readContract({
      address: deployment[chainId || (currentChain?.id as number)].erc20safe,
      abi: ERC20Safe.abi,
      functionName: "getDepositedAmount",
      args: [account.address, tokenAddress],
      chainId: chainId || currentChain?.id,
    });

    return data as BigNumber;
  };

  // CLAIMS
  const fetchClaims = async () => {
    fetchingClaims.on();

    let claims: ClaimStruct[] = [];
    for (const chain of configuredChains) {
      const bridgeContract = getContract({
        address: deployment[chain.id].bridge,
        abi: Bridge.abi,
        signerOrProvider: getProvider({ chainId: chain.id }),
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

        if (!BigNumber.from(depositedAmount).isZero() && tokenData) {
          claims.push({
            claimId: claims.length,
            token: tokenData,
            amount: availableToClaim,
            sourceChainId: chain.id,
            targetChainId: configuredChains.find((ch) => ch.id !== chain.id)
              ?.id as number,
            isClaimed: isClaimed,
          });
        }
      }
    }
    setClaims(claims);

    fetchingClaims.off();
  };
  const updateClaim = async (
    owner: string,
    tokenAddress: string,
    amount: string
  ) => {
    try {
      if (owner === account.address) {
        console.log("updating claim...");
        console.log("claims before updating", userClaims);
        let claims: ClaimStruct[] = [];

        const claimIndex = userClaims.findIndex(
          (claim) =>
            claim.token.address.toLowerCase() === tokenAddress.toLowerCase()
        );

        claims =
          claimIndex !== -1
            ? userClaims.map((claim, index) => {
                if (claimIndex === index) {
                  claim.isClaimed
                    ? (claim.amount = BigNumber.from(amount))
                    : (claim.amount = claim.amount.add(amount));
                }
                return claim;
              })
            : [
                ...userClaims,
                {
                  claimId: claims.length,
                  token: (await getTokenData(
                    tokenAddress,
                    currentChain?.id as number
                  )) as TokenData,
                  amount: BigNumber.from(amount),
                  sourceChainId: currentChain?.id as number,
                  targetChainId: configuredChains.find(
                    (ch) => ch.id !== currentChain?.id
                  )?.id as number,
                  isClaimed: false,
                },
              ];

        console.log("claims", claims);
        setClaims(claims);
      }
    } catch (err) {
      console.log("Error 'updateToken'", (err as Error).message);
    }
  };
  const isTokenClaimed = async (token: Address, chain: Chain) => {
    // SOURCE CHAIN
    const bridgeContract = getContract({
      address: deployment[chain.id].bridge,
      abi: Bridge.abi,
      signerOrProvider: getProvider({
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

    // console.log("allDeposits", formatFixed(allDeposits, 18));
    // console.log("allReleases", formatFixed(allReleases, 18));

    // TARGET CHAIN
    const targetChain = configuredChains.find(
      (ch) => ch.id !== chain.id
    ) as Chain;
    const targetBridgeContract = getContract({
      address: deployment[targetChain.id].bridge,
      abi: Bridge.abi,
      signerOrProvider: getProvider({
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
    // console.log("allBurns", formatFixed(allBurns, 18));
    // console.log("allWithdrawals", formatFixed(allWithdrawals, 18));

    // console.log("sourceChainAmount", formatFixed(sourceChainAmount, 18));
    // console.log("targetChainAmount", formatFixed(targetChainAmount, 18));

    return {
      isClaimed: targetChainAmount.gte(sourceChainAmount),
      availableToClaim: targetChainAmount.gte(sourceChainAmount)
        ? targetChainAmount
        : sourceChainAmount.sub(targetChainAmount),
    };
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
                currentChainId={currentChain?.id as number}
                alchemy={alchemy}
                availableChains={availableChains}
                currentUserAddress={account.address as Address}
                userTokens={userTokens}
                userDeposits={userDeposits}
                depositsAreFetching={depositsAreFetching}
                getTokenData={getTokenData}
                getDepositedAmount={getDepositedAmount}
                getUserTokens={fetchUserTokens}
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
                chains={configuredChains}
                availableChains={availableChains}
                currentAddress={account.address as Address}
                isNetworkSwitching={networkSwitcher.isLoading}
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
