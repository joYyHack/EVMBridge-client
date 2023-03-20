import { Network } from "alchemy-sdk";
import { Address } from "wagmi";

export enum TokenType {
  Native = 0,
  Wrapped = 1,
}

interface IBridgeAddress {
  bridge: Address;
  erc20safe: Address;
  validator: Address;
}

interface IBridgeData {
  [chainId: number]: IBridgeAddress;
}

export const addresses: IBridgeData = {
  11155111 /* sepolia */: {
    bridge: "0x025F22Ccbe9FCEbC4dFC359E36051498eC8c9c3F",
    erc20safe: "0x70c0f0bDc053d86e58566Dc65105974D7d412B2C",
    validator: "0x66C394b3dDCA8B25f34D9A3C6c8291cAdA9f2383",
  },
  80001 /* mumbai */: {
    bridge: "0x025F22Ccbe9FCEbC4dFC359E36051498eC8c9c3F",
    erc20safe: "0x70c0f0bDc053d86e58566Dc65105974D7d412B2C",
    validator: "0x66C394b3dDCA8B25f34D9A3C6c8291cAdA9f2383",
  },
};
