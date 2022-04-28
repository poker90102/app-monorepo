import React, { FC } from 'react';

import { Button } from 'native-base';

import { autoHideSelectFunc } from '../utils/SelectAutoHide';

import type { IButtonProps } from 'native-base';

const ButtonCapture: FC<IButtonProps> = ({ onPress, ...props }) => {
  const onPressOverride = React.useCallback(
    (e) => {
      autoHideSelectFunc(e);
      onPress?.(e);
    },
    [onPress],
  );
  return <Button {...props} onPress={onPressOverride} />;
};

export { ButtonCapture as default };
