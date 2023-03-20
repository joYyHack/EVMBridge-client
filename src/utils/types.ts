import { FetchTokenResult } from "@wagmi/core";
import { BigNumber } from "ethers";

export type TokenData = Omit<FetchTokenResult, "totalSupply" | "address"> & {
  address: string;
};
export type UserTokenData = TokenData & {
  userBalance: string;
};
export type DepositStruct = {
  token: TokenData;
  amount: BigNumber;
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
