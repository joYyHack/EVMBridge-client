import { Stack, Button, ButtonGroup } from "@chakra-ui/react";

const LockReleaseButton = () => {
  return (
    <Stack direction="row" spacing={4} align="center" justify="center">
      <Button colorScheme="teal" variant="solid">
        Lock
      </Button>
      <Button colorScheme="teal" variant="outline">
        Release
      </Button>
    </Stack>
  );
};

export default LockReleaseButton;
