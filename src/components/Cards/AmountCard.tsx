import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Heading,
  Text,
  Button,
  InputGroup,
  Input,
  InputRightElement,
  Stack,
} from "@chakra-ui/react";
import { useState } from "react";

type AmountCardProps = {
  amount: string;
  setAmount: any;
  zerosAmount: number;
  setZerosAmount: any;
};

const AmountCard = ({
  amount,
  setAmount,
  zerosAmount,
  setZerosAmount,
}: AmountCardProps) => {
  return (
    <Card className="mx-5 my-5" align="center">
      <CardHeader>
        <Heading>Choose Token Amount</Heading>
      </CardHeader>
      <CardBody>
        <Stack>
          <Input value={amount} onChange={setAmount} />
          <Button size="sm" onClick={setZerosAmount}>
            Add zeros: {zerosAmount}
          </Button>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default AmountCard;
