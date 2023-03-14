import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Heading,
  Text,
  Select,
  Input,
} from "@chakra-ui/react";
const TokenCard = () => {
  return (
    <Card className="mx-5 my-5" align="center">
      <CardHeader>
        <Heading>Choose Token Address</Heading>
      </CardHeader>
      <CardBody width="30%">
        <Input
          focusBorderColor="lime"
          placeholder="0xC2C527C0CACF457746Bd31B2a698Fe89de2b6d49"
        />
      </CardBody>
    </Card>
  );
};

export default TokenCard;
