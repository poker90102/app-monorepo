import React from 'react';

import { Spinner, Center, Box } from '@onekeyhq/components';

const SpinnerGallery = () => (
  <Center flex="1" bg="background-hovered">
    <Box margin="10px">
      <Spinner size="lg" />
    </Box>

    <Box margin="10px">
      <Spinner size="sm" />
    </Box>
  </Center>
);

export default SpinnerGallery;
