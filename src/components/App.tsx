import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { WagmiConfig, configureChains, createClient } from "wagmi";
import { goerli, hardhat } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";

import Bridge from "../pages/Bridge";

import Header from "./layout/Header";
// import Footer from "./layout/Footer";

function App() {
  const { provider } = configureChains([goerli, hardhat], [publicProvider()]);

  const client = createClient({
    provider,
    autoConnect: true,
  });

  return (
    <BrowserRouter>
      <WagmiConfig client={client}>
        <div className="wrapper">
          <Header />
          <div className="main">
            <Routes>
              <Route path="/" element={<Bridge />} />
            </Routes>
          </div>
          {/* <Footer /> */}
        </div>
      </WagmiConfig>
    </BrowserRouter>
  );
}

export default App;
