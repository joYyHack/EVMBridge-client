import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Center, Heading } from "@chakra-ui/react";
import { configureChains, createClient, useNetwork, WagmiConfig } from "wagmi";
import { polygonMumbai, sepolia } from "wagmi/chains";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";

import BridgeView from "../pages/BridgeView";

import Header from "./layout/Header";

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

  const { chain: currentChain } = useNetwork();
  const [isConnected, setIsConnected] = useState<boolean>();
  const setConnectedStatus = (isConnected: boolean) => {
    setIsConnected(isConnected);
  };
  useEffect(
    () => console.log("isHeaderConnected - app", isConnected),
    [isConnected]
  );
  useEffect(() => {
    console.log(
      "show bridge",
      isConnected && chains.some((ch) => ch.id === currentChain?.id),
      "is connected",
      isConnected,
      "correct chain",
      chains.some((ch) => ch.id === currentChain?.id)
    );
  }, [isConnected, currentChain]);
  return (
    <BrowserRouter>
      <WagmiConfig client={client}>
        <div className="wrapper">
          <Header
            connector={connector}
            setConnectedStatus={setConnectedStatus}
          />
          <div className="main">
            {isConnected && chains.some((ch) => ch.id === currentChain?.id) ? (
              <Routes>
                <Route
                  path="/"
                  element={<BridgeView configuredChains={chains} />}
                />
              </Routes>
            ) : (
              <Center h="100vh">
                <Heading>
                  {!isConnected
                    ? "Connect your wallet"
                    : `Incorrect chain. Supported chains are: ${chains
                        .map((ch) => ch.name)
                        .join(", ")}`}
                </Heading>
              </Center>
            )}
          </div>
        </div>
      </WagmiConfig>
    </BrowserRouter>
  );
}

export default App;
