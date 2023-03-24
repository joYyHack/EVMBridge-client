import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Container,
  Divider,
  Flex,
  Heading,
  Spinner,
  Text,
  useBoolean,
} from "@chakra-ui/react";
import { formatFixed, parseFixed } from "@ethersproject/bignumber";
import {
  Chain,
  getNetwork as network,
  prepareWriteContract,
  readContract,
  writeContract,
} from "@wagmi/core";
import { BigNumber, constants, utils } from "ethers";
import { BaseSyntheticEvent, useEffect, useState } from "react";
import { Address, erc20ABI } from "wagmi";
import Bridge from "../abi/Bridge.json";
import BurnButton from "../components/Buttons/BurnButton";
import DepositReleaseButton from "../components/Buttons/DepositReleaseButton";
import AmountCard from "../components/Cards/AmountCard";
import BridgeCard from "../components/Cards/BridgeCard";
import TokenCard from "../components/Cards/TokenCard";
import { AlchemyMultichainClient } from "../utils/alchemy/alchemy-multichain-client";
import { deployment, TokenType } from "../utils/consts&enums";
import { networksDictionary } from "../utils/networksDict";
import type {
  ClaimStruct,
  DepositStruct,
  TokenData,
  TxStruct,
  UserTokenData,
  ValidationResult,
} from "../utils/types";
import {
  createReleaseRequest,
  signWithdrawalRequest,
} from "../utils/validator";

type DepositProps = {
  alchemy: AlchemyMultichainClient;
  currentChainId: number;
  availableChains: Chain[];
  currentUserAddress: Address;
  currentUserToken: UserTokenData | undefined;
  isValidDepositAmount: boolean;
  isValidReleaseAmount: boolean;
  amount: string;
  userTokens: UserTokenData[];
  userDeposits: DepositStruct[];
  depositsAreFetching: boolean;
  userClaims: ClaimStruct[];
  setCurrentUserToken: React.Dispatch<
    React.SetStateAction<UserTokenData | undefined>
  >;
  setIsValidDepositAmount: React.Dispatch<React.SetStateAction<boolean>>;
  setIsValidReleaseAmount: React.Dispatch<React.SetStateAction<boolean>>;
  setAmount: React.Dispatch<React.SetStateAction<string>>;
  handleChainSelect: (e: BaseSyntheticEvent) => void;
  getUserTokens: () => Promise<void>;
  getTokenData: (tokenAddress: Address) => Promise<TokenData | null>;
  getDepositedAmount: (
    tokenAddress: Address,
    chainId?: number
  ) => Promise<BigNumber>;
  updateCurrentUserToken: (tokenAddress: string) => Promise<{
    isSuccess: boolean;
    errorMsg: string;
    validationObj: UserTokenData;
  }>;
  validateAmount: (currentUserToken: UserTokenData, amount: number) => void;
};
const DepositView = ({
  alchemy,
  currentChainId,
  availableChains,
  currentUserAddress,
  userTokens,
  userDeposits,
  depositsAreFetching,
  userClaims,
  currentUserToken,
  setCurrentUserToken,
  amount,
  setAmount,
  isValidDepositAmount,
  setIsValidDepositAmount,
  isValidReleaseAmount,
  setIsValidReleaseAmount,
  handleChainSelect,
  getTokenData,
  updateCurrentUserToken,
  validateAmount,
}: DepositProps) => {
  const [tokenApproved, tokenApproval] = useBoolean();
  const [tokenDeposited, tokenDeposit] = useBoolean();
  const [tokenReleased, tokenRelease] = useBoolean();
  const [tokenBurnt, tokenBurn] = useBoolean();

  const [inDeposit, depositProcess] = useBoolean();
  const [inRelease, releaseProcess] = useBoolean();
  const [inBurn, burnProcess] = useBoolean();

  const [approvalTx, setApprovalTx] = useState<TxStruct>({
    hash: "",
    err: "",
  });
  const [depositTx, setDepositTx] = useState<TxStruct>({
    hash: "",
    err: "",
  });
  const [releaseTx, setReleaseTx] = useState<TxStruct>({
    hash: "",
    err: "",
  });
  const [burnTx, setBurnTx] = useState<TxStruct>({
    hash: "",
    err: "",
  });

  // TOKENS
  const handleTokenInputOrSelect = (e: BaseSyntheticEvent) => {
    const selectedToken = userTokens.find(
      (token) => token.address === e.target.value.trim()
    );
    if (selectedToken) {
      validateAmount(selectedToken, Number.parseFloat(amount));
    } else {
      setIsValidDepositAmount(false);
      setIsValidReleaseAmount(false);
    }

    setCurrentUserToken(selectedToken);
  };
  const validateTokenAddress = async (
    e: BaseSyntheticEvent
  ): Promise<ValidationResult> => {
    const val = e.target.value.trim();
    if (utils.isAddress(val)) {
      if (
        (await alchemy
          .forNetwork(networksDictionary[network().chain?.id as number])
          .core.getCode(val)) !== "0x"
      ) {
        try {
          const token = await getTokenData(val as Address);

          if (!token) throw new Error();

          const userBalance = (
            await alchemy
              .forNetwork(networksDictionary[currentChainId])
              .core.getTokenBalances(currentUserAddress, [token.address])
          ).tokenBalances[0].tokenBalance;

          const userToken = {
            ...token,
            userBalance,
          } as UserTokenData;

          validateAmount(userToken, Number.parseFloat(amount));

          setCurrentUserToken(userToken);

          return {
            isSuccess: true,
            errorMsg: "",
            validationObj: userToken as UserTokenData,
          };
        } catch (err) {
          return { isSuccess: false, errorMsg: "NOT AN ERC20" };
        }
      }
      return { isSuccess: false, errorMsg: "NOT A CONTRACT" };
    }
    return { isSuccess: false, errorMsg: "INVALID ADDRESS" };
  };

  // TOKENS AMOUNT
  const handleAmountInput = (amount: string) => {
    setAmount(amount);
    try {
      validateAmount(
        currentUserToken as UserTokenData,
        Number.parseFloat(amount)
      );
    } catch (err) {
      console.log("handleAmountInput", (err as Error).message);
    }
  };
  const handleAmountBlur = (e: BaseSyntheticEvent) => {
    try {
      const amountAsNumber = Number.parseFloat(e.target.value);
      setAmount(e.target.value);
      currentUserToken
        ? validateAmount(currentUserToken, amountAsNumber)
        : setIsValidDepositAmount(false);
    } catch {
      setIsValidDepositAmount(false);
    }
  };
  // MODAL
  const handleCloseModal = () => {
    setApprovalTx({ hash: "", err: "" });
    setDepositTx({ hash: "", err: "" });
    setReleaseTx({ hash: "", err: "" });
    setBurnTx({ hash: "", err: "" });
    depositProcess.off();
    releaseProcess.off();
    burnProcess.off();

    try {
      validateAmount(
        currentUserToken as UserTokenData,
        Number.parseFloat(amount)
      );
    } catch {}
  };

  const getApproval = async () => {
    try {
      const approval = await readContract({
        address:
          (currentUserToken?.address as Address) ?? constants.AddressZero,
        abi: erc20ABI,
        functionName: "allowance",
        args: [currentUserAddress, deployment[currentChainId].erc20safe],
      });

      return approval as BigNumber;
    } catch (e) {
      setApprovalTx({ hash: "", err: (e as Error).message });
      throw new Error();
    }
  };
  const approve = async () => {
    try {
      const config = await prepareWriteContract({
        address:
          (currentUserToken?.address as Address) ?? constants.AddressZero,
        abi: erc20ABI,
        functionName: "approve",
        args: [deployment[currentChainId].erc20safe, constants.MaxUint256],
      });
      const tx = await writeContract(config);
      setApprovalTx({ hash: tx.hash, err: "" });
      const reciept = await tx.wait();
    } catch (e) {
      setApprovalTx({ hash: "", err: (e as Error).message });
      throw new Error();
    }
  };

  const deposit = async () => {
    try {
      const config = await prepareWriteContract({
        address: deployment[currentChainId].bridge,
        abi: Bridge.abi,
        functionName: "deposit",
        args: [
          currentUserToken?.address,
          parseFixed(amount, currentUserToken?.decimals),
        ],
      });

      const tx = await writeContract(config);
      setDepositTx({ hash: tx.hash, err: "" });

      const reciept = await tx.wait();
    } catch (e) {
      setDepositTx({ hash: "", err: (e as Error).message });
      throw new Error();
    }
  };
  const release = async (signature: string) => {
    try {
      const config = await prepareWriteContract({
        address: deployment[currentChainId].bridge,
        abi: Bridge.abi,
        functionName: "release",
        args: [
          currentUserToken?.address,
          parseFixed(amount, currentUserToken?.decimals),
          signature,
        ],
      });
      const tx = await writeContract(config);
      setReleaseTx({ hash: tx.hash, err: "" });

      const reciept = await tx.wait();
    } catch (e) {
      setReleaseTx({ hash: "", err: (e as Error).message });
      throw new Error();
    }
  };

  const burn = async () => {
    try {
      const config = await prepareWriteContract({
        address: deployment[currentChainId].bridge,
        abi: Bridge.abi,
        functionName: "burn",
        args: [
          currentUserToken?.address,
          parseFixed(amount, currentUserToken?.decimals),
        ],
      });

      const tx = await writeContract(config);
      setBurnTx({ hash: tx.hash, err: "" });

      const reciept = await tx.wait();
    } catch (e) {
      setBurnTx({ hash: "", err: (e as Error).message });
      throw new Error();
    }
  };

  const handleDepositClick = async () => {
    try {
      depositProcess.on();

      tokenApproval.off();
      tokenDeposit.off();

      const approval = await getApproval();

      if (approval?.lt(parseFixed(amount, currentUserToken?.decimals))) {
        await approve();
      }

      tokenApproval.on();

      await deposit();
      tokenDeposit.on();

      await updateCurrentUserToken(currentUserToken?.address as string);
    } catch (error) {
      console.log(error);
    }
  };
  const handleBurnClick = async () => {
    try {
      burnProcess.on();

      tokenApproval.off();
      tokenBurn.off();

      const approval = await getApproval();

      if (approval?.lt(parseFixed(amount, currentUserToken?.decimals))) {
        await approve();
      }

      tokenApproval.on();

      await burn();
      tokenBurn.on();

      await updateCurrentUserToken(currentUserToken?.address as string);
    } catch (error) {
      console.log(error);
    }
  };
  const handleReleaseClick = async () => {
    try {
      releaseProcess.on();

      tokenRelease.off();

      const req = await createReleaseRequest(
        currentUserAddress,
        parseFixed(amount, currentUserToken?.decimals),
        currentUserToken?.address ?? constants.AddressZero
      );
      const sig = await signWithdrawalRequest(req);

      await release(sig);
      tokenRelease.on();

      await updateCurrentUserToken(currentUserToken?.address as string);
    } catch (error) {
      console.log((error as Error).message);
    }
  };

  return (
    <>
      <Container maxWidth="5xl" mb="8">
        <BridgeCard
          availableChains={availableChains}
          onChainSelect={handleChainSelect}
        />
        <TokenCard
          currentUserAddress={currentUserToken?.address}
          userTokens={userTokens}
          handleTokenInputOrSelect={handleTokenInputOrSelect}
          validateTokenAddress={validateTokenAddress}
        />
        <AmountCard
          currentUserToken={currentUserToken}
          amount={amount}
          isValidAmount={isValidDepositAmount}
          handleAmountInput={handleAmountInput}
          handleAmountBlur={handleAmountBlur}
        />
        {currentUserToken?.tokenInfo.tokenType == TokenType.Wrapped ? (
          <BurnButton
            tokenApproved={tokenApproved}
            tokenBurnt={tokenBurnt}
            burn={handleBurnClick}
            approvalTx={approvalTx}
            burnTx={burnTx}
            inBurn={inBurn}
            handleCloseModal={handleCloseModal}
            isValidAmount={isValidDepositAmount}
          />
        ) : (
          <DepositReleaseButton
            tokenApproved={tokenApproved}
            tokenDeposited={tokenDeposited}
            tokenReleased={tokenReleased}
            deposit={handleDepositClick}
            release={handleReleaseClick}
            approvalTx={approvalTx}
            depositTx={depositTx}
            releaseTx={releaseTx}
            inDeposit={inDeposit}
            inRelease={inRelease}
            handleCloseModal={handleCloseModal}
            isValidDepositAmount={isValidDepositAmount}
            isValidReleaseAmount={isValidReleaseAmount}
          />
        )}
      </Container>

      <Divider mb="7" />
      {depositsAreFetching ? (
        <Flex justifyContent="center" direction="row">
          <Text mr="4">Fetching deposits</Text>
          <Spinner />
        </Flex>
      ) : (
        <Accordion allowToggle>
          <AccordionItem>
            <h2>
              <AccordionButton
                justifyContent="center"
                fontStyle="normal"
                fontWeight="semibold"
                bgColor="teal.600"
              >
                <Text>SHOW DEPOSITED TOKENS</Text>
                <AccordionIcon ml="2" />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4} bgColor="gray.600">
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
                {userDeposits.map((deposit, index) => (
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
                      {formatFixed(deposit.amount, deposit.token.decimals)}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
    </>
  );
};

export default DepositView;
