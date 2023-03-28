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
    bridge: "0x5EAb426BA4398cb951f0aA8C87047bE45E45aaA2",
    erc20safe: "0xEB570d133E97d896a2431332f827F7DA6BCf2e70",
    validator: "0x1278E54A70698d7b3B0A00855b34BE3E2f965a0B",
  },
  80001 /* mumbai */: {
    bridge: "0x5EAb426BA4398cb951f0aA8C87047bE45E45aaA2",
    erc20safe: "0xEB570d133E97d896a2431332f827F7DA6BCf2e70",
    validator: "0x1278E54A70698d7b3B0A00855b34BE3E2f965a0B",
  },
};
