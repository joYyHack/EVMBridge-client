import { Address } from "wagmi";

export enum TokenType {
  Native = 0,
  Wrapped = 1,
}

export const PERMIT_SELECTOR = "0x9d8ff7da";

export const deployment = {
  bridge: "0xce56e2D1e03e653bc95F113177A2Be6002068B7E" as Address,
  erc20safe: "0x268653b20B3a3aE011A42d2b0D6b9F97eC42ca2d" as Address,
  validator: "0xb564990E0fD557345f4e87F10ECA0F641a557671" as Address,
};
