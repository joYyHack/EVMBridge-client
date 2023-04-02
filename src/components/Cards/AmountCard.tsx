import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
} from "@chakra-ui/react";
import { formatFixed } from "@ethersproject/bignumber";
import { BigNumber } from "ethers";
import { BaseSyntheticEvent } from "react";
import type { UserTokenData } from "../../utils/types";

type AmountCardProps = {
  currentUserToken: UserTokenData | undefined;
  amount: string;
  isValidAmount: boolean;
  handleAmountInput: (amount: string) => void;
  handleAmountBlur: (e: BaseSyntheticEvent) => void;
};
const AmountCard = ({
  currentUserToken,
  amount,
  isValidAmount,
  handleAmountInput,
  handleAmountBlur,
}: AmountCardProps) => {
  const parseBalance = (currentUserToken: UserTokenData): string => {
    const formatted = formatFixed(
      BigNumber.from(currentUserToken.userBalance),
      currentUserToken.decimals
    );

    let main: string, fraction: string;
    [main, fraction] = formatted.split(".");
    if (fraction.length > 2) fraction = fraction.substring(0, 2);

    return `${main}.${fraction}`;
  };

  return (
    <Card className="mx-5 my-5" align="center">
      <CardHeader>
        <Heading>Choose Token Amount</Heading>
      </CardHeader>
      <CardBody>
        <Flex justifyContent="center" alignItems="center">
          <NumberInput
            min={0}
            maxWidth="150px"
            borderColor="lime"
            isInvalid={!isValidAmount}
            allowMouseWheel
            value={!amount || Number.isNaN(amount) ? "0" : amount}
            onChange={(amount, _) => handleAmountInput(amount)}
            onBlur={handleAmountBlur}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Box ml="5" textAlign="center">
            {currentUserToken &&
              !BigNumber.from(currentUserToken.userBalance).isZero() && (
                <>
                  <Text>Balance</Text>
                  <Text>{parseBalance(currentUserToken)}</Text>
                </>
              )}
          </Box>
        </Flex>
      </CardBody>
    </Card>
  );
};

export default AmountCard;
