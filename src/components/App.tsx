import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { WagmiConfig, configureChains, createClient, useAccount } from "wagmi";
import { goerli, sepolia, polygonMumbai } from "wagmi/chains";
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
  const client = createClient({
    provider,
    autoConnect: true,
  });

  const account = useAccount();

  return (
    <BrowserRouter>
      <WagmiConfig client={client}>
        <div className="wrapper">
          <Header />
          <div className="main">
            {account.isConnected && (
              <Routes>
                <Route
                  path="/"
                  element={<BridgeView provider={provider} chains={chains} />}
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
