import { readContract } from "@wagmi/core";
import { BigNumber, constants, providers, Wallet } from "ethers";
import Validator from "../abi/Validator.json";
import ERC20Safe from "../abi/ERC20Safe.json";
import ERC165 from "../abi/ERC165.json";
import { TokenType } from "./consts&enums";
import { privKey } from "./encoding";
import { Address } from "wagmi";
import { fetchToken, getNetwork } from "@wagmi/core";
import { deployment } from "./consts&enums";

let validatorWalletAddress: Address;
let validatorContractAddress: Address;
let bridgeAddress: Address;
let erc20SafeAddress: Address;

type WithdrawalRequest = {
  validator: string;
  bridge: string;
  from: string;
  amount: BigNumber;
  sourceToken: string;
  sourceTokenSymbol: string;
  sourceTokenName: string;
  isSourceTokenPermit: boolean;
  wrappedToken: string;
  withdrawalTokenType: TokenType;
  nonce: BigNumber;
};

let domain = {
  name: "Validator",
  version: "0.1",
  chainId: 0,
  verifyingContract: constants.AddressZero,
};
const types = {
  WithdrawalRequest: [
    { name: "validator", type: "address" },
    { name: "bridge", type: "address" },
    { name: "from", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "sourceToken", type: "address" },
    { name: "sourceTokenSymbol", type: "string" },
    { name: "sourceTokenName", type: "string" },
    { name: "isSourceTokenPermit", type: "bool" },
    { name: "wrappedToken", type: "address" },
    { name: "withdrawalTokenType", type: "uint8" },
    { name: "nonce", type: "uint256" },
  ],
};

let provider: providers.Provider;
let signer: Wallet;

export const setValidator = async (newProvider: providers.Provider) => {
  provider = newProvider;
  signer = new Wallet(privKey("dead"), provider);
  validatorWalletAddress = signer.address as Address;
  const chainId = (await provider.getNetwork()).chainId;
  const addrs = deployment[chainId];

  validatorContractAddress = addrs.validator;
  bridgeAddress = addrs.bridge;
  erc20SafeAddress = addrs.erc20safe;

  domain.chainId = chainId;
  domain.verifyingContract = addrs.validator;
};

const getNonce = async (from: Address) =>
  await readContract({
    address: validatorContractAddress,
    abi: Validator.abi,
    functionName: "getNonce",
    args: [from],
  });

const isPermit = async (token: Address, chainId: number) => {
  try {
    let isPermit = await readContract({
      address: token,
      abi: ERC165.abi,
      functionName: "supportsInterface",
      args: ["0x9d8ff7da"],
      chainId: chainId,
    });
    return isPermit as boolean;
  } catch {
    return false;
  }
};

const getWrappedToken = async (sourceToken: string) =>
  await readContract({
    address: erc20SafeAddress,
    abi: ERC20Safe.abi,
    functionName: "getWrappedToken",
    args: [sourceToken],
  });

const getTokenNameAndSymbol = async (token: Address, chainId: number) => {
  const tokenData = await fetchToken({
    address: token,
    chainId: chainId,
  });

  return { name: tokenData.name, symbol: tokenData.symbol };
};

export const createReleaseRequest = async (
  from: Address,
  amount: BigNumber,
  sourceToken: string
) => {
  const chainId = getNetwork().chain?.id as number;
  const { name, symbol } = await getTokenNameAndSymbol(
    sourceToken as Address,
    chainId
  );
  return {
    validator: validatorWalletAddress,
    bridge: bridgeAddress,
    from: from.toString(),
    amount,
    sourceToken,
    sourceTokenSymbol: symbol,
    sourceTokenName: name,
    isSourceTokenPermit: await isPermit(sourceToken as Address, chainId),
    wrappedToken: await getWrappedToken(sourceToken),
    withdrawalTokenType: TokenType.Native,
    nonce: await getNonce(from),
  } as WithdrawalRequest;
};
export const createWithdrawRequest = async (
  from: Address,
  amount: BigNumber,
  sourceToken: string
) => {
  const { chain, chains } = getNetwork();
  const sourceChainId = chains.find((ch) => chain?.id != ch.id)?.id as number;
  const { name, symbol } = await getTokenNameAndSymbol(
    sourceToken as Address,
    sourceChainId
  );
  return {
    validator: validatorWalletAddress,
    bridge: bridgeAddress,
    from: from.toString(),
    amount,
    sourceToken,
    sourceTokenSymbol: symbol,
    sourceTokenName: name,
    isSourceTokenPermit: await isPermit(sourceToken as Address, sourceChainId),
    wrappedToken: await getWrappedToken(sourceToken),
    withdrawalTokenType: TokenType.Wrapped,
    nonce: await getNonce(from),
  } as WithdrawalRequest;
};

export const signWithdrawalRequest = async (value: WithdrawalRequest) => {
  const sig = await signer._signTypedData(domain, types, value);
  console.log("domain", domain);
  console.log("value", value);
  return sig;
};
