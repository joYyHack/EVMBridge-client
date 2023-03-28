import React, { useEffect } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";

import {
  WagmiConfig,
  configureChains,
  createClient,
  useAccount,
  useNetwork,
  Chain,
  Connector,
} from "wagmi";
import { goerli, sepolia, polygonMumbai } from "wagmi/chains";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";

import BridgeView from "../pages/BridgeView";

import Header from "./layout/Header";
// import Footer from "./layout/Footer";

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

  const account = useAccount();
  const { chain: currentChain } = useNetwork();

  return (
    <BrowserRouter>
      <WagmiConfig client={client}>
        <div className="wrapper">
          <Header connector={connector as Connector} />
          <div className="main">
            {account.isConnected &&
              chains.some((ch) => ch.id === currentChain?.id) && (
                <Routes>
                  <Route
                    path="/"
                    element={<BridgeView configuredChains={chains} />}
                  />
                </Routes>
              )}
          </div>
          {/* <Footer /> */}
        </div>
      </WagmiConfig>
    </BrowserRouter>
  );
}

export default App;
