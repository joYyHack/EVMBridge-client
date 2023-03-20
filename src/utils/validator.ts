import { readContract } from "@wagmi/core";
import { BigNumber, constants, providers, Wallet } from "ethers";
import Validator from "../abi/Validator.json";
import ERC20Safe from "../abi/ERC20Safe.json";
import { TokenType } from "./consts&enums";
import { privKey } from "./encoding";
import { Address } from "wagmi";
import { addresses } from "./consts&enums";

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
  const addrs = addresses[chainId];

  validatorContractAddress = addrs.validator;
  bridgeAddress = addrs.bridge;
  erc20SafeAddress = addrs.erc20safe;

  console.log("validator: ", validatorContractAddress);
  console.log("bridgeAddress: ", bridgeAddress);
  console.log("erc20SafeAddress: ", erc20SafeAddress);

  domain.chainId = chainId;
  domain.verifyingContract = addrs.validator;

  console.log("domain", domain);
};

const getNonce = async (from: Address) =>
  await readContract({
    address: validatorContractAddress,
    abi: Validator.abi,
    functionName: "getNonce",
    args: [from],
  });

export const getWrappedToken = async (sourceToken: string) =>
  await readContract({
    address: erc20SafeAddress,
    abi: ERC20Safe.abi,
    functionName: "getWrappedToken",
    args: [sourceToken],
  });

export const createReleaseRequest = async (
  from: Address,
  amount: BigNumber,
  sourceToken: string
) => {
  return {
    validator: validatorWalletAddress,
    bridge: bridgeAddress,
    from: from.toString(),
    amount,
    sourceToken,
    wrappedToken: constants.AddressZero,
    withdrawalTokenType: TokenType.Native,
    nonce: await getNonce(from),
  } as WithdrawalRequest;
};
export const createWithdrawRequest = async (
  from: Address,
  amount: BigNumber,
  sourceToken: string
) => {
  return {
    validator: validatorWalletAddress,
    bridge: bridgeAddress,
    from: from.toString(),
    amount,
    sourceToken,
    wrappedToken: await getWrappedToken(sourceToken),
    withdrawalTokenType: TokenType.Wrapped,
    nonce: await getNonce(from),
  } as WithdrawalRequest;
};

export const signWithdrawalRequest = async (value: WithdrawalRequest) => {
  const sig = await signer._signTypedData(domain, types, value);
  return sig;
};
