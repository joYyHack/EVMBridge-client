import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Input,
  Select,
  Spinner,
  Text,
  useBoolean,
} from "@chakra-ui/react";
import { BaseSyntheticEvent, useState } from "react";
import type { UserTokenData, ValidationResult } from "../../utils/types";

type TokenProps = {
  currentUserAddress: string | undefined;
  userTokens: UserTokenData[];
  handleTokenInputOrSelect: (e: BaseSyntheticEvent) => void;
  validateTokenAddress: (e: BaseSyntheticEvent) => Promise<ValidationResult>;
};
const TokenCard = ({
  currentUserAddress,
  userTokens,
  handleTokenInputOrSelect,
  validateTokenAddress,
}: TokenProps) => {
  const [isValidAddress, setValidAddress] = useState<boolean>(false);
  const [desc, setDesc] = useState<string>("");
  const [isLoading, loader] = useBoolean(false);

  return (
    <Card className="mx-5 my-5" align="center">
      <CardHeader>
        <Heading>Choose Token</Heading>
      </CardHeader>
      <CardBody>
        <Flex
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
        >
          <Flex flexDirection="row">
            <Input
              minWidth="400px"
              placeholder="0xC2C527C0CACF457746Bd31B2a698Fe89de2b6d49"
              variant="flushed"
              mr="4"
              borderColor="lime"
              value={currentUserAddress}
              isInvalid={!isValidAddress}
              onChange={handleTokenInputOrSelect}
              onBlur={async (e: BaseSyntheticEvent) => {
                loader.on();

                if (e.target.value.trim() !== currentUserAddress) {
                  const result = await validateTokenAddress(e);
                  setValidAddress(result.isSuccess);
                  setDesc(
                    result.isSuccess
                      ? result.validationObj?.symbol
                      : result.errorMsg
                  );
                } else {
                  setValidAddress(true);
                  setDesc("");
                }

                loader.off();
              }}
            />
            <Select
              variant="flushed"
              ml="4"
              placeholder="Select Token"
              value={currentUserAddress ?? ""}
              onChange={(e: BaseSyntheticEvent) => {
                handleTokenInputOrSelect(e);
                setValidAddress(e.target.value);
                setDesc("");
              }}
            >
              {userTokens.map((token) => {
                return (
                  <option key={token.address} value={token.address}>
                    {token.symbol}
                  </option>
                );
              })}
            </Select>
          </Flex>
          <Box height="4" mt="3">
            {isLoading ? <Spinner /> : <Text>{desc}</Text>}
          </Box>
        </Flex>
      </CardBody>
    </Card>
  );
};

export default TokenCard;
