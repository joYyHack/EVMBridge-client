import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Center, Heading } from "@chakra-ui/react";
import { configureChains, createClient, useNetwork, WagmiConfig } from "wagmi";
import { polygonMumbai, sepolia } from "wagmi/chains";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";

import BridgeWrapper from "./layout/BridgeWrapper";

function App() {
  const { provider, chains } = configureChains(
    [sepolia, polygonMumbai],
    [
      alchemyProvider({ apiKey: "iGl7Y2YJaZ6q2XQq5G9HKyikfRGAYNHA" }),
      alchemyProvider({ apiKey: "RsqAHU7zE2lhDluXXXJjn2uhC6MnbBdf" }),
      publicProvider(),
    ]
  );
  const connector = new MetaMaskConnector({
    chains: chains,
    options: {
      UNSTABLE_shimOnConnectSelectAccount: true,
    },
  });
  const client = createClient({
    provider,
    connectors: [connector],
    autoConnect: true,
  });

  return (
    <BrowserRouter>
      <WagmiConfig client={client}>
        <BridgeWrapper chains={chains} connector={connector} />
      </WagmiConfig>
    </BrowserRouter>
  );
}

export default App;
