import { Alchemy, Network } from "alchemy-sdk";
import { AlchemyMultichainClient } from "./alchemy-multichain-client";
// Default config to use for all networks.
// Include optional setting overrides for specific networks.
const chainsSetup = {
  // TODO: Replace with your API keys.
  [Network.ETH_SEPOLIA]: { apiKey: "iGl7Y2YJaZ6q2XQq5G9HKyikfRGAYNHA" },
  [Network.MATIC_MUMBAI]: { apiKey: "RsqAHU7zE2lhDluXXXJjn2uhC6MnbBdf" },
};

const alchemy = new AlchemyMultichainClient(chainsSetup);

export default alchemy;
