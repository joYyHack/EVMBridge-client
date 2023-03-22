import {
  Stack,
  Button,
  ButtonGroup,
  useDisclosure,
  Text,
  Heading,
  Flex,
  Icon,
  Spinner,
  Link,
} from "@chakra-ui/react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";
import { BaseSyntheticEvent } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@chakra-ui/react";
import { CheckIcon, CloseIcon } from "@chakra-ui/icons";
import { Chain } from "wagmi";
import type { TxStruct } from "../../utils/types";
import { getNetwork } from "@wagmi/core";

type BurnButtonProps = {
  tokenApproved: boolean;
  tokenBurnt: boolean;
  burn: () => Promise<void>;
  approvalTx: TxStruct;
  burnTx: TxStruct;
  inBurn: boolean;
  handleCloseModal: () => void;
  isValidAmount: boolean;
};

const BurnButton = ({
  tokenApproved,
  tokenBurnt,
  burn,
  approvalTx,
  burnTx,
  inBurn,
  handleCloseModal,
  isValidAmount,
}: BurnButtonProps) => {
  const currentChain = getNetwork().chain;
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Stack direction="row" spacing={4} align="center" justify="center">
        <Button
          isLoading={inBurn}
          colorScheme="teal"
          variant="solid"
          onClick={async () => {
            onOpen();
            burn();
          }}
          isDisabled={!isValidAmount}
        >
          Burn
        </Button>
      </Stack>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          handleCloseModal();
        }}
        isCentered
        size="3xl"
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign="center">Burning</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {inBurn && (
              <>
                <Card mb="3">
                  <CardBody>
                    <Flex justifyContent="space-between" alignItems="center">
                      <Heading fontSize="3xl">Approval</Heading>
                      {tokenApproved ? (
                        <CheckIcon boxSize="8" />
                      ) : approvalTx.err ? (
                        <CloseIcon boxSize="8" />
                      ) : (
                        <Spinner boxSize="8" />
                      )}
                    </Flex>
                    {approvalTx.err && (
                      <Text color="red" fontSize="small">
                        Tx data: {approvalTx.err}
                      </Text>
                    )}
                    {approvalTx.hash && (
                      <Link
                        fontSize="small"
                        color="teal.500"
                        href={`${currentChain?.blockExplorers?.default.url}/tx/${approvalTx.hash}`}
                        isExternal
                      >
                        Tx data: {approvalTx.hash}
                      </Link>
                    )}
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <Flex justifyContent="space-between" alignItems="center">
                      <Heading fontSize="3xl">Burn</Heading>
                      {tokenApproved &&
                        (tokenBurnt ? (
                          <CheckIcon boxSize="8" />
                        ) : burnTx.err ? (
                          <CloseIcon boxSize="8" />
                        ) : (
                          <Spinner boxSize="8" />
                        ))}
                    </Flex>
                    {burnTx.err && (
                      <Text color="red" fontSize="small">
                        Tx data: {burnTx.err}
                      </Text>
                    )}
                    {burnTx.hash && (
                      <Link
                        fontSize="small"
                        color="teal.500"
                        href={`${currentChain?.blockExplorers?.default.url}/tx/${burnTx.hash}`}
                        isExternal
                      >
                        Tx data: {burnTx.hash}
                      </Link>
                    )}
                  </CardBody>
                </Card>
              </>
            )}
          </ModalBody>

          <ModalFooter></ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default BurnButton;
