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
};
export type UserTokenData = TokenData & {
  userBalance: string;
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
export type ValidationResult = {
  isSuccess: boolean;
  errorMsg: string;
  validationObj?: any;
};
export type TxStruct = {
  hash: string;
  err: string;
};
