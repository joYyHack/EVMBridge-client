import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Heading,
  Text,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react";
const AmountCard = () => {
  return (
    <Card className="mx-5 my-5" align="center">
      <CardHeader>
        <Heading>Choose Token Amount</Heading>
      </CardHeader>
      <CardBody>
        <NumberInput defaultValue={0}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </CardBody>
    </Card>
  );
};

export default AmountCard;
