import { Address } from "wagmi";

export enum TokenType {
  Native = 0,
  Wrapped = 1,
}

interface IDeploymentAddress {
  bridge: Address;
  erc20safe: Address;
  validator: Address;
}

interface IDeployment {
  [chainId: number]: IDeploymentAddress;
}

export const deployment: IDeployment = {
  11155111 /* sepolia */: {
    bridge: "0xC2894d489618B23dB236847BaaFeF1B2Ef3938Ae",
    erc20safe: "0xB1F3C795279756539E065963bD6E73bECE0B86D1",
    validator: "0x34a230228B122B0ef4e4dd511F2b26fE9647E9F7",
  },
  80001 /* mumbai */: {
    bridge: "0xC2894d489618B23dB236847BaaFeF1B2Ef3938Ae",
    erc20safe: "0xB1F3C795279756539E065963bD6E73bECE0B86D1",
    validator: "0x34a230228B122B0ef4e4dd511F2b26fE9647E9F7",
  },
};
