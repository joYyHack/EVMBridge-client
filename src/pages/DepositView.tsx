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
  getProvider,
  prepareWriteContract,
  readContract,
  signTypedData,
  writeContract,
} from "@wagmi/core";
import { BigNumber, constants, Contract, utils } from "ethers";
import { BaseSyntheticEvent, useState } from "react";
import { Address, erc20ABI } from "wagmi";
import Bridge from "../abi/Bridge.json";
import ERC20Permit from "../abi/ERC20Permit.json";
import BurnButton from "../components/Buttons/BurnButton";
import DepositReleaseButton from "../components/Buttons/DepositReleaseButton";
import AmountCard from "../components/Cards/AmountCard";
import BridgeCard from "../components/Cards/BridgeCard";
import TokenCard from "../components/Cards/TokenCard";
import { AlchemyMultichainClient } from "../utils/alchemy/alchemy-multichain-client";
import { deployment, TokenType } from "../utils/consts&enums";
import { networks } from "../utils/networksDict";
import type {
  ClaimStruct,
  DepositStruct,
  PermitRequest,
  TokenData,
  TxStruct,
  UserTokenData,
  ValidationResult,
} from "../utils/types";
import { truncate } from "../utils/truncate";
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
  getUserClaim: (token: string) => ClaimStruct | undefined;
  claimsAreFetching: boolean;
  depositsAreFetching: boolean;
  setUserToken: (currentUserToken: UserTokenData | undefined) => void;
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
  getUserClaim,
  claimsAreFetching,
  depositsAreFetching,
  currentUserToken,
  setUserToken,
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
    data: "",
    err: "",
  });
  const [depositTx, setDepositTx] = useState<TxStruct>({
    data: "",
    err: "",
  });
  const [releaseTx, setReleaseTx] = useState<TxStruct>({
    data: "",
    err: "",
  });
  const [burnTx, setBurnTx] = useState<TxStruct>({
    data: "",
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
    console.log("selected token", selectedToken);
    setUserToken(selectedToken);
  };
  const validateTokenAddress = async (
    e: BaseSyntheticEvent
  ): Promise<ValidationResult> => {
    const val = e.target.value.trim();
    if (utils.isAddress(val)) {
      if (
        (await alchemy
          .forNetwork(networks[network().chain?.id as number])
          .core.getCode(val)) !== "0x"
      ) {
        try {
          const token = await getTokenData(val as Address);

          if (!token) throw new Error();

          const userBalance = (
            await alchemy
              .forNetwork(networks[currentChainId])
              .core.getTokenBalances(currentUserAddress, [token.address])
          ).tokenBalances[0].tokenBalance;

          const userToken = {
            ...token,
            userBalance,
          } as UserTokenData;

          validateAmount(userToken, Number.parseFloat(amount));

          setUserToken(userToken);

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
    setApprovalTx({ data: "", err: "" });
    setDepositTx({ data: "", err: "" });
    setReleaseTx({ data: "", err: "" });
    setBurnTx({ data: "", err: "" });
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
        args: [currentUserAddress, deployment.erc20safe],
      });

      return approval as BigNumber;
    } catch (e) {
      setApprovalTx({ data: "", err: (e as Error).message });
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
        args: [deployment.erc20safe, constants.MaxUint256],
      });
      const tx = await writeContract(config);
      setApprovalTx({ data: tx.hash, err: "" });
      await tx.wait();
    } catch (e) {
      setApprovalTx({ data: "", err: (e as Error).message });
      throw new Error();
    }
  };
  const approvePermit = async (): Promise<PermitRequest> => {
    try {
      const token = currentUserToken as UserTokenData;
      // All properties on a domain are optional
      const permit = new Contract(
        token.address,
        ERC20Permit.abi,
        getProvider({ chainId: currentChainId })
      );
      const nonce = (await permit.nonces(currentUserAddress)) as BigNumber;
      const domain = {
        name: token.name,
        version: "1",
        chainId: currentChainId,
        verifyingContract: token.address as Address,
      } as const;
      // The named list of all type definitions
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      } as const;
      const value = {
        owner: currentUserAddress,
        spender: deployment.erc20safe,
        value: parseFixed(amount, currentUserToken?.decimals),
        nonce: nonce,
        deadline: constants.MaxUint256,
      };
      const rawSignature = await signTypedData({
        domain,
        types,
        value,
      });
      setApprovalTx({ data: rawSignature, err: "" });
      const signature = utils.splitSignature(rawSignature);
      return { ...value, v: signature.v, r: signature.r, s: signature.s };
    } catch (e) {
      setApprovalTx({ data: "", err: (e as Error).message });
      throw new Error();
    }
  };

  const deposit = async () => {
    try {
      const config = await prepareWriteContract({
        address: deployment.bridge,
        abi: Bridge.abi,
        functionName: "deposit",
        args: [
          currentUserToken?.address,
          parseFixed(amount, currentUserToken?.decimals),
        ],
      });

      const tx = await writeContract(config);
      setDepositTx({ data: tx.hash, err: "" });

      const reciept = await tx.wait();
    } catch (e) {
      setDepositTx({ data: "", err: (e as Error).message });
      throw new Error();
    }
  };

  const depositPermit = async (permit: PermitRequest) => {
    try {
      const config = await prepareWriteContract({
        address: deployment.bridge,
        abi: Bridge.abi,
        functionName: "depositPermit",
        args: [
          currentUserToken?.address,
          parseFixed(amount, currentUserToken?.decimals),
          permit.deadline,
          permit.v,
          permit.r,
          permit.s,
        ],
      });

      const tx = await writeContract(config);
      setDepositTx({ data: tx.hash, err: "" });

      const reciept = await tx.wait();
    } catch (e) {
      setDepositTx({ data: "", err: (e as Error).message });
      throw new Error();
    }
  };

  const release = async (signature: string) => {
    try {
      const config = await prepareWriteContract({
        address: deployment.bridge,
        abi: Bridge.abi,
        functionName: "release",
        args: [
          currentUserToken?.address,
          parseFixed(amount, currentUserToken?.decimals),
          signature,
        ],
      });
      const tx = await writeContract(config);
      setReleaseTx({ data: tx.hash, err: "" });

      const reciept = await tx.wait();
    } catch (e) {
      setReleaseTx({ data: "", err: (e as Error).message });
      throw new Error();
    }
  };

  const burn = async () => {
    try {
      const config = await prepareWriteContract({
        address: deployment.bridge,
        abi: Bridge.abi,
        functionName: "burn",
        args: [
          currentUserToken?.address,
          parseFixed(amount, currentUserToken?.decimals),
        ],
      });

      const tx = await writeContract(config);
      setBurnTx({ data: tx.hash, err: "" });

      const reciept = await tx.wait();
    } catch (e) {
      setBurnTx({ data: "", err: (e as Error).message });
      throw new Error();
    }
  };
  const burnPermit = async (permit: PermitRequest) => {
    try {
      const config = await prepareWriteContract({
        address: deployment.bridge,
        abi: Bridge.abi,
        functionName: "burnPermit",
        args: [
          currentUserToken?.address,
          parseFixed(amount, currentUserToken?.decimals),
          permit.deadline,
          permit.v,
          permit.r,
          permit.s,
        ],
      });

      const tx = await writeContract(config);
      setBurnTx({ data: tx.hash, err: "" });

      const reciept = await tx.wait();
    } catch (e) {
      setBurnTx({ data: "", err: (e as Error).message });
      throw new Error();
    }
  };

  const handleDepositClick = async () => {
    try {
      depositProcess.on();

      tokenApproval.off();
      tokenDeposit.off();

      let permit;

      const approval = await getApproval();
      if (approval?.lt(parseFixed(amount, currentUserToken?.decimals))) {
        if (currentUserToken?.isPermit) {
          permit = await approvePermit();
        } else {
          await approve();
        }
      }
      tokenApproval.on();

      permit ? await depositPermit(permit) : await deposit();
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

      let permit;

      const approval = await getApproval();
      if (approval?.lt(parseFixed(amount, currentUserToken?.decimals))) {
        if (currentUserToken?.isPermit) {
          permit = await approvePermit();
        } else {
          await approve();
        }
      }
      tokenApproval.on();

      permit ? await burnPermit(permit) : await burn();
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

      const response = await fetch("/api/v1/createReleaseRequest", {
        method: "POST",
        body: JSON.stringify({
          from: currentUserAddress,
          amount: parseFixed(amount, currentUserToken?.decimals).toString(),
          sourceToken: currentUserToken?.address,
          chainId: currentChainId,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const { sig } = await response.json();

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
            currentUserToken={currentUserToken as UserTokenData}
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
            currentUserToken={currentUserToken as UserTokenData}
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
                  <Heading fontSize="md" flexBasis="20%" textAlign="left">
                    Address
                  </Heading>
                  <Heading fontSize="md" flexBasis="20%" textAlign="center">
                    Symbol
                  </Heading>
                  <Heading fontSize="md" flexBasis="20%" textAlign="right">
                    Available To Release
                  </Heading>
                  <Heading fontSize="md" flexBasis="20%" textAlign="right">
                    Claimed Amount
                  </Heading>
                  <Heading fontSize="md" flexBasis="20%" textAlign="right">
                    Locked Amount
                  </Heading>
                </Flex>
                <Divider my="4" />
                {userDeposits.map((deposit, index) => (
                  <Flex
                    key={index}
                    direction="row"
                    justifyContent="space-between"
                  >
                    <Text fontSize="md" flexBasis="20%" textAlign="left">
                      {truncate(deposit.token.address as string, 10)}
                    </Text>
                    <Text fontSize="md" flexBasis="20%" textAlign="center">
                      {deposit.token.symbol}
                    </Text>
                    <Text fontSize="md" flexBasis="20%" textAlign="right">
                      {claimsAreFetching ? (
                        <Spinner size="md" />
                      ) : (
                        formatFixed(
                          getUserClaim(deposit.token.address)?.isClaimed
                            ? "0"
                            : getUserClaim(deposit.token.address)?.amount ??
                                "0",
                          deposit.token.decimals
                        )
                      )}
                    </Text>
                    <Text fontSize="md" flexBasis="20%" textAlign="right">
                      {claimsAreFetching ? (
                        <Spinner size="md" />
                      ) : (
                        formatFixed(
                          getUserClaim(deposit.token.address)?.isClaimed
                            ? getUserClaim(deposit.token.address)?.amount ?? "0"
                            : deposit.amount.sub(
                                getUserClaim(deposit.token.address)?.amount ??
                                  "0"
                              ),
                          deposit.token.decimals
                        )
                      )}
                    </Text>
                    <Text fontSize="md" flexBasis="20%" textAlign="right">
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
