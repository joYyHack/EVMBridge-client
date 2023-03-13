import React from "react";
import {
  useConnect,
  useDisconnect,
  useAccount,
  useBalance,
  useNetwork,
} from "wagmi";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { goerli, polygonMumbai as mumbai } from "wagmi/chains";

import { truncate } from "../../utils/truncate";
import Button from "../../ui/Button";

const md5 = require("md5");

function Header() {
  const connector = new MetaMaskConnector({
    chains: [goerli, mumbai],
    options: {
      UNSTABLE_shimOnConnectSelectAccount: true,
    },
  });

  const { isConnected, address } = useAccount();
  const { connect, isLoading } = useConnect({
    connector,
  });
  const { disconnect } = useDisconnect();

  const { chain } = useNetwork();

  const { data } = useBalance({
    address,
  });

  const handleConnectButtonClick = async () => {
    connect();
  };

  const handleDisconnectButtonClick = async () => {
    disconnect();
  };

  return (
    <div className="header-wrapper">
      <div className="header">
        <div className="container d-flex justify-content-between align-item-center">
          <a href="/">
            <img
              src="https://limeacademy.tech/wp-content/uploads/2021/08/limeacademy_logo.svg"
              alt=""
            />
          </a>
          <p>{chain?.name}</p>
          <div className="d-flex">
            {isLoading ? (
              <span>Loading...</span>
            ) : isConnected ? (
              <>
                <div className="d-flex align-items-center justify-content-end">
                  <img
                    className="img-profile me-3"
                    src={`https://www.gravatar.com/avatar/${md5(
                      address
                    )}/?d=identicon`}
                    alt=""
                  />

                  <span>{truncate(address as string, 6)}</span>
                  <span className="mx-4">|</span>

                  <Button onClick={handleDisconnectButtonClick}>
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={handleConnectButtonClick}>
                Connect MetaMask
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
