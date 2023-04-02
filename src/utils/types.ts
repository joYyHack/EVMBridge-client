import { Address, FetchTokenResult } from "@wagmi/core";
import { BigNumber } from "ethers";
import { TokenType } from "./consts&enums";

export type TokenInfo = {
  sourceToken: Address;
  tokenType: TokenType;
};
export type TokenData = Omit<FetchTokenResult, "totalSupply" | "address"> & {
  address: string;
  tokenInfo: TokenInfo;
  isPermit: boolean;
};
export type UserTokenData = TokenData & {
  userBalance: string;
};
export type TxStruct = {
  data: string;
  err: string;
};
export type DepositStruct = {
  token: TokenData;
  amount: BigNumber;
};
export type ClaimStruct = DepositStruct & {
  claimId: number;
  sourceChainId: number;
  targetChainId: number;
  isClaimed: boolean;
};
export type PermitRequest = {
  owner: string;
  spender: string;
  value: BigNumber;
  nonce: BigNumber;
  deadline: BigNumber;
  v: number;
  r: string;
  s: string;
};

export type ValidationResult = {
  isSuccess: boolean;
  errorMsg: string;
  validationObj?: any;
};
