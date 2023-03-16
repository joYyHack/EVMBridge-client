import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Heading,
  Text,
  Select,
  InputGroup,
  Input,
  InputRightElement,
  IconButton,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
} from "@chakra-ui/react";

import { CheckIcon } from "@chakra-ui/icons";

type TokenProps = {
  address: string;
  setToken: any;
};

const TokenCard = ({ address, setToken }: TokenProps) => {
  return (
    <Card className="mx-5 my-5" align="center">
      <CardHeader>
        <Heading>Choose Token Address</Heading>
      </CardHeader>
      <CardBody>
        <InputGroup>
          <Input
            placeholder="0xC2C527C0CACF457746Bd31B2a698Fe89de2b6d49"
            value={address}
            onChange={setToken}
          />
          {/* <InputRightElement>
              <IconButton
                aria-label="Validate token address"
                icon={<CheckIcon />}
                onClick={() => validateTokenAddress("")}
                //type="submit"
              /> 
            </InputRightElement>*/}
        </InputGroup>
      </CardBody>
    </Card>
  );
};

export default TokenCard;
