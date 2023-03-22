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
    // bridge: "0x5500c299B0B7cF6eb3d5FEA23AB98ABb0E58F68D",
    // erc20safe: "0x22615d60CE7DE7b33e65a0cbCAf38fD24e916EB7",
    // validator: "0xBAb91fC66e8bd8E9ed146712D24465E2A09120bB",
    bridge: "0x2B4724036f1658c9d2DC46e007087D310A7ef55F",
    erc20safe: "0xB2173C21955159012A73F3a72db44D5BE6541F4A",
    validator: "0x7Df59D8789d1116D512658d72C0966042be52961",
  },
  80001 /* mumbai */: {
    bridge: "0xf2A5aB6083c82C61E3639b6145151D4981B48Cbc",
    erc20safe: "0x5C7313268D19dF2902C59468eB6D4f3De6DE2CE2",
    validator: "0xCdeEf2A8ceBdF329Ce343ae7bcd98C9EDe5d8B9b",
  },
};
