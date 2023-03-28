import { CheckIcon, CloseIcon } from "@chakra-ui/icons";
import {
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { getNetwork } from "@wagmi/core";
import type { TxStruct, UserTokenData } from "../../utils/types";

type DepositReleaseButtonProps = {
  currentUserToken: UserTokenData;
  tokenApproved: boolean;
  tokenDeposited: boolean;
  tokenReleased: boolean;
  approvalTx: TxStruct;
  depositTx: TxStruct;
  releaseTx: TxStruct;
  inDeposit: boolean;
  inRelease: boolean;
  isValidDepositAmount: boolean;
  isValidReleaseAmount: boolean;
  deposit: () => Promise<void>;
  release: () => Promise<void>;
  handleCloseModal: () => void;
};

const LockReleaseButton = ({
  currentUserToken,
  tokenApproved,
  tokenDeposited,
  tokenReleased,
  approvalTx,
  depositTx,
  releaseTx,
  inDeposit,
  inRelease,
  isValidDepositAmount,
  isValidReleaseAmount,
  deposit,
  release,
  handleCloseModal,
}: DepositReleaseButtonProps) => {
  const currentChain = getNetwork().chain;
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Stack direction="row" spacing={4} align="center" justify="center">
        <Button
          isLoading={inDeposit}
          colorScheme="teal"
          variant="solid"
          onClick={async () => {
            onOpen();
            deposit();
          }}
          isDisabled={!isValidDepositAmount}
        >
          Deposit
        </Button>
        <Button
          isLoading={inRelease}
          colorScheme="teal"
          variant="outline"
          onClick={async () => {
            onOpen();
            release();
          }}
          isDisabled={!isValidReleaseAmount}
        >
          Release Deposited Tokens
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
          <ModalHeader textAlign="center">
            {inDeposit && "Depositing"}
            {inRelease && "Releasing"}
          </ModalHeader>

          {inDeposit && (
            <>
              {(depositTx.err || approvalTx.err || tokenDeposited) && (
                <ModalCloseButton />
              )}
              <ModalBody>
                <Card mb="3">
                  <CardBody>
                    <Flex justifyContent="space-between" alignItems="center">
                      <Heading fontSize="3xl">
                        {currentUserToken.isPermit
                          ? "Permit message"
                          : "Approval"}
                      </Heading>
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
                    {approvalTx.data && !currentUserToken.isPermit && (
                      <Link
                        fontSize="small"
                        color="teal.500"
                        href={`${currentChain?.blockExplorers?.default.url}/tx/${approvalTx.data}`}
                        isExternal
                      >
                        Tx data: {approvalTx.data}
                      </Link>
                    )}
                    {approvalTx.data && currentUserToken.isPermit && (
                      <Text color="green" fontSize="small">
                        Signed: {approvalTx.data}
                      </Text>
                    )}
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <Flex justifyContent="space-between" alignItems="center">
                      <Heading fontSize="3xl">Deposit</Heading>
                      {tokenApproved &&
                        (tokenDeposited ? (
                          <CheckIcon boxSize="8" />
                        ) : depositTx.err ? (
                          <CloseIcon boxSize="8" />
                        ) : (
                          <Spinner boxSize="8" />
                        ))}
                    </Flex>
                    {depositTx.err && (
                      <Text color="red" fontSize="small">
                        Tx data: {depositTx.err}
                      </Text>
                    )}
                    {depositTx.data && (
                      <Link
                        fontSize="small"
                        color="teal.500"
                        href={`${currentChain?.blockExplorers?.default.url}/tx/${depositTx.data}`}
                        isExternal
                      >
                        Tx data: {depositTx.data}
                      </Link>
                    )}
                  </CardBody>
                </Card>
              </ModalBody>
            </>
          )}
          {inRelease && (
            <>
              {(releaseTx.err || tokenReleased) && <ModalCloseButton />}
              <ModalBody>
                <Card mb="3">
                  <CardBody>
                    <Flex justifyContent="space-between" alignItems="center">
                      <Heading fontSize="3xl">Release</Heading>
                      {tokenReleased ? (
                        <CheckIcon boxSize="8" />
                      ) : releaseTx.err ? (
                        <CloseIcon boxSize="8" />
                      ) : (
                        <Spinner boxSize="8" />
                      )}
                    </Flex>
                    {releaseTx.err && (
                      <Text color="red" fontSize="small">
                        Tx data: {releaseTx.err}
                      </Text>
                    )}
                    {releaseTx.data && (
                      <Link
                        fontSize="small"
                        color="teal.500"
                        href={`${currentChain?.blockExplorers?.default.url}/tx/${releaseTx.data}`}
                        isExternal
                      >
                        Tx data: {releaseTx.data}
                      </Link>
                    )}
                  </CardBody>
                </Card>
              </ModalBody>
            </>
          )}

          <ModalFooter></ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default LockReleaseButton;
