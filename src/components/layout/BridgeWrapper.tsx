import { Center, Heading, Text } from "@chakra-ui/react";
import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import {
  Chain,
  Connector,
  useAccount,
  useConnect,
  useDisconnect,
  useNetwork,
} from "wagmi";

import BridgeView from "../../pages/BridgeView";

import Header from "./Header";

type BridgeWrapperProps = {
  chains: Chain[];
  connector: Connector;
};
function BridgeWrapper({ chains, connector }: BridgeWrapperProps) {
  const { chain: currentChain } = useNetwork();
  const { isConnected, address } = useAccount();

  const { connect, isLoading } = useConnect({
    connector,
  });
  const { disconnect } = useDisconnect();

  const handleConnectButtonClick = async () => {
    connect();
  };

  const handleDisconnectButtonClick = async () => {
    disconnect();
  };
  return (
    <>
      <Header
        handleConnectButtonClick={handleConnectButtonClick}
        handleDisconnectButtonClick={handleDisconnectButtonClick}
        isConnected={isConnected}
        isLoading={isLoading}
        address={address}
        chain={currentChain}
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
    </>
  );
}

export default BridgeWrapper;
