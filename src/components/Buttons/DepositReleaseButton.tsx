import { Stack, Button, ButtonGroup } from "@chakra-ui/react";

type DepositReleaseButtonProps = {
  deposit: any;
  release: any;
  depositLoading: boolean;
  releaseLoading: boolean;
};

const LockReleaseButton = ({
  deposit,
  release,
  depositLoading,
  releaseLoading,
}: DepositReleaseButtonProps) => {
  return (
    <Stack direction="row" spacing={4} align="center" justify="center">
      <Button
        isLoading={depositLoading}
        colorScheme="teal"
        variant="solid"
        onClick={deposit}
      >
        Lock
      </Button>
      <Button
        isLoading={releaseLoading}
        colorScheme="teal"
        variant="outline"
        onClick={release}
      >
        Release
      </Button>
    </Stack>
  );
};

export default LockReleaseButton;
