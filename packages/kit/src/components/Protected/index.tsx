/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import React, { FC, useCallback, useEffect, useState } from 'react';

import { useNavigation } from '@react-navigation/core';
import { useIntl } from 'react-intl';

import { Box, Spinner, ToastManager, Typography } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { useData, useGetWalletDetail } from '@onekeyhq/kit/src/hooks/redux';
import { useHardwareError } from '@onekeyhq/kit/src/hooks/useHardwareError';
import debugLogger from '@onekeyhq/shared/src/logger/debugLogger';
import { IOneKeyDeviceFeatures } from '@onekeyhq/shared/types';

import Session from './Session';
import Setup from './Setup';
import { ValidationFields } from './types';

type ProtectedOptions = {
  isLocalAuthentication?: boolean;
  withEnableAuthentication?: boolean;
  deviceFeatures?: IOneKeyDeviceFeatures;
};

type ProtectedProps = {
  skipSavePassword?: boolean;
  /** walletId for current flow, null means createWallet flow */
  walletId: string | null;
  field?: ValidationFields;
  children: (password: string, options: ProtectedOptions) => React.ReactNode;
};

const Protected: FC<ProtectedProps> = ({
  children,
  skipSavePassword,
  field,
  walletId,
}) => {
  const navigation = useNavigation();
  const walletDetail = useGetWalletDetail(walletId);
  const intl = useIntl();
  const { engine, serviceHardware } = backgroundApiProxy;
  const [deviceFeatures, setDeviceFeatures] = useState<IOneKeyDeviceFeatures>();
  const [password, setPassword] = useState('');
  const [withEnableAuthentication, setWithEnableAuthentication] =
    useState<boolean>();
  const [isLocalAuthentication, setLocalAuthentication] = useState<boolean>();
  const { isPasswordSet } = useData();
  const [hasPassword] = useState(isPasswordSet);
  const { captureHardwareError } = useHardwareError();

  const onValidationOk = useCallback((text: string, value?: boolean) => {
    setLocalAuthentication(value);
    setPassword(text);
  }, []);

  const onSetupOk = useCallback((text: string, value?: boolean) => {
    setWithEnableAuthentication(value);
    setPassword(text);
  }, []);

  const safeGoBack = useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  }, [navigation]);

  /**
   * Hardware Wallet dont need input password at here, hardware need to input password at device
   *
   * also if it is hardware device, need to connect bluetooth and check connection status
   */
  const isHardware = walletDetail?.type === 'hw';

  useEffect(() => {
    if (!isHardware) return;

    function throwDeviceCheckError() {
      ToastManager.show({
        title: intl.formatMessage({ id: 'action__connection_timeout' }),
      });
      safeGoBack();
    }

    async function loadDevices() {
      if (!walletDetail?.id) {
        throwDeviceCheckError();
        return;
      }

      const currentWalletDevice = await engine.getHWDeviceByWalletId(
        walletDetail.id,
      );

      if (!currentWalletDevice) {
        throwDeviceCheckError();
        return;
      }

      let features: IOneKeyDeviceFeatures | null = null;
      try {
        const featuresCache = await serviceHardware.getFeatursByWalletId(
          walletDetail.id,
        );
        if (featuresCache) {
          features = featuresCache;
          debugLogger.hardwareSDK.debug('use features cache: ', featuresCache);
        } else {
          features = await serviceHardware.getFeatures(currentWalletDevice.mac);
        }
      } catch (e: any) {
        safeGoBack();
        captureHardwareError(e);
        return;
      }

      if (!features) {
        ToastManager.show({
          title: intl.formatMessage({ id: 'action__connection_timeout' }),
        });
        safeGoBack();
        return;
      }

      // device connect success
      setDeviceFeatures(features);
    }
    loadDevices();
  }, [
    isHardware,
    engine,
    walletDetail?.id,
    intl,
    safeGoBack,
    serviceHardware,
    captureHardwareError,
  ]);

  if (password) {
    return (
      <Box w="full" h="full">
        {children(password, {
          withEnableAuthentication,
          isLocalAuthentication,
        })}
      </Box>
    );
  }

  if (isHardware) {
    if (deviceFeatures) {
      return (
        <Box w="full" h="full">
          {children(password, {
            withEnableAuthentication,
            isLocalAuthentication,
            deviceFeatures,
          })}
        </Box>
      );
    }

    return (
      <>
        <Box h="100%" justifyContent="center" alignItems="center">
          <Spinner size="lg" />
          <Typography.DisplayMedium mt={6}>
            {intl.formatMessage({ id: 'modal__device_status_check' })}
          </Typography.DisplayMedium>
        </Box>
      </>
    );
  }

  if (hasPassword) {
    return <Session onOk={onValidationOk} field={field} />;
  }
  return <Setup onOk={onSetupOk} skipSavePassword={skipSavePassword} />;
};

export default Protected;
export { ValidationFields };
