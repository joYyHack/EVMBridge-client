import { Network } from "alchemy-sdk";

interface INetworkDictionary {
  [chainId: number]: Network;
}

export default {
  11155111: Network.ETH_SEPOLIA,
  80001: Network.MATIC_MUMBAI,
} as INetworkDictionary;
