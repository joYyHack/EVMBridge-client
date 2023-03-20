import { Card, CardBody, CardHeader, Heading, Select } from "@chakra-ui/react";
import { Chain } from "wagmi";

type BridgeCardProps = {
  availableChains: Chain[];
  onChainSelect: any;
};
const BridgeCard = ({ availableChains, onChainSelect }: BridgeCardProps) => {
  return (
    <Card className="mx-5 my-5" align="center">
      <CardHeader>
        <Heading>Choose target network</Heading>
      </CardHeader>
      <CardBody>
        <Select size="lg" variant="Filled" onChange={onChainSelect}>
          {availableChains.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </Select>
      </CardBody>
    </Card>
  );
};

export default BridgeCard;
