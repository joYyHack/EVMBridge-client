import { readContract } from "@wagmi/core";
import { BigNumber, constants, providers, Wallet } from "ethers";
import Validator from "../abi/Validator.json";
import { TokenType } from "./consts&enums";
import { privKey } from "./encoding";

const validatorWalletAddress = "0xe1AB69E519d887765cF0bb51D0cFFF2264B38080";
const validatorContractAddress = "0x7af33287A69F420e648eCf8f238227CE830c6805";
const bridgeAddress = "0xce56e2D1e03e653bc95F113177A2Be6002068B7E";

type Address = `0x${string}`;
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
  verifyingContract: validatorContractAddress,
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

  domain.chainId = (await provider.getNetwork()).chainId;
  console.log(domain);
};

const getNonce = async (from: Address) =>
  await readContract({
    address: validatorContractAddress,
    abi: Validator.abi,
    functionName: "getNonce",
    args: [from],
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

export const signReleaseRequest = async (value: WithdrawalRequest) =>
  await signer._signTypedData(domain, types, value);
