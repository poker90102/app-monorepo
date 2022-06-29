import React, { FC, useCallback, useEffect, useState } from 'react';

import { useNavigation } from '@react-navigation/native';
import { useIntl } from 'react-intl';

import {
  Badge,
  Box,
  Center,
  DialogManager,
  HStack,
  Icon,
  Image,
  LottieView,
  Modal,
  ScrollView,
  Spinner,
  Typography,
  VStack,
} from '@onekeyhq/components';
import ClassicDeviceIcon from '@onekeyhq/components/img/deviceIcon_classic.png';
import MiniDeviceIcon from '@onekeyhq/components/img/deviceIcon_mini.png';
import TouchDeviceIcon from '@onekeyhq/components/img/deviceicon_touch.png';
import PressableItem from '@onekeyhq/components/src/Pressable/PressableItem';
import { Device } from '@onekeyhq/engine/src/types/device';
import KeepDeviceAroundSource from '@onekeyhq/kit/assets/wallet/keep_device_close.png';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import NeedBridgeDialog from '@onekeyhq/kit/src/components/NeedBridgeDialog';
import { useRuntime } from '@onekeyhq/kit/src/hooks/redux';
import {
  CreateWalletModalRoutes,
  CreateWalletRoutesParams,
} from '@onekeyhq/kit/src/routes/Modal/CreateWallet';
import {
  ModalRoutes,
  ModalScreenProps,
  RootRoutes,
  RootRoutesParams,
} from '@onekeyhq/kit/src/routes/types';
import { SearchDevice, deviceUtils } from '@onekeyhq/kit/src/utils/hardware';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { IOneKeyDeviceType } from '@onekeyhq/shared/types';

import { Wallet } from '../../../../../engine/src/types/wallet';
import { DeviceErrors } from '../../../utils/hardware/deviceUtils';

type NavigationProps = ModalScreenProps<RootRoutesParams> &
  ModalScreenProps<CreateWalletRoutesParams>;

const getDeviceIcon = (
  type: IOneKeyDeviceType,
): import('react-native').ImageSourcePropType | undefined => {
  switch (type) {
    case 'classic':
      return ClassicDeviceIcon as number;
    case 'mini':
      return MiniDeviceIcon as number;
    case 'touch':
      return TouchDeviceIcon as number;
    default:
      return undefined;
  }
};

type SearchDeviceInfo = {
  wallet?: Wallet;
} & SearchDevice;

const ConnectHardwareModal: FC = () => {
  const intl = useIntl();
  const { engine } = backgroundApiProxy;
  const navigation = useNavigation<NavigationProps['navigation']>();
  const [isSearching, setIsSearching] = useState(false);
  const [isConnectingDeviceId, setIsConnectingDeviceId] = useState('');

  const [searchedDevices, setSearchedDevices] = useState<SearchDevice[]>([]);
  const [checkBonded, setCheckBonded] = useState(false);
  const [devices, setDevices] = useState<SearchDeviceInfo[]>([]);

  const { wallets } = useRuntime();
  const [deviceWallets, setDeviceWallets] = useState<Record<string, Wallet>>();

  useEffect(() => {
    (async () => {
      const localDevices = (await engine.getHWDevices()).reduce<
        Record<string, Device>
      >((acc, device) => ({ ...acc, [device.id ?? '']: device }), {});

      const findWallets: Record<string, Wallet> = {};

      wallets.forEach((wallet) => {
        if (wallet.type !== 'hw') return;
        if (wallet.accounts.length === 0) return;
        const device = localDevices[wallet.associatedDevice ?? ''];
        if (!device) return;
        findWallets[device.mac] = wallet;
      });

      setDeviceWallets(findWallets);
    })();
  }, [engine, wallets]);

  const handleStopDevice = useCallback(() => {
    if (!deviceUtils) return;
    deviceUtils.stopScan();
  }, []);

  const convert = useCallback(
    (searchDevices: SearchDevice[]): SearchDeviceInfo[] => {
      const convertDevices = searchDevices.flatMap((device) => ({
        ...device,
        wallet: deviceWallets?.[device?.connectId ?? ''],
      }));
      return convertDevices;
    },
    [deviceWallets],
  );

  useEffect(() => {
    setDevices(convert(searchedDevices));
  }, [convert, searchedDevices]);

  const handleScanDevice = useCallback(async () => {
    if (!deviceUtils) return;
    setIsSearching(true);

    const checkBridge = await deviceUtils.checkBridge();
    if (!checkBridge) {
      DialogManager.show({ render: <NeedBridgeDialog /> });
      return;
    }

    deviceUtils.startDeviceScan((response) => {
      if (!response.success) {
        setIsSearching(false);
        return;
      }

      setSearchedDevices(response.payload);
    });
  }, []);

  useEffect(() => {
    if (platformEnv.isRuntimeBrowser) handleScanDevice();
    return () => {
      handleStopDevice();
      deviceUtils.stopCheckBonded();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectDeviceWithDevice = useCallback(
    (device: SearchDevice) => {
      if (!deviceUtils || !device) return;
      if (!device.connectId) return;

      deviceUtils.stopScan();
      setIsConnectingDeviceId(device.connectId);

      const finishConnected = (result?: boolean) => {
        setIsConnectingDeviceId('');
        if (!result) {
          return;
        }
        navigation.navigate(RootRoutes.Modal, {
          screen: ModalRoutes.CreateWallet,
          params: {
            screen: CreateWalletModalRoutes.DeviceStatusCheckModal,
            params: {
              device,
            },
          },
        });
      };
      deviceUtils
        .connect(device.connectId)
        .then((result) => {
          finishConnected(result);
        })
        .catch(async (err) => {
          switch (err) {
            case DeviceErrors.DeviceNotBonded: {
              if (!checkBonded && platformEnv.isNativeAndroid) {
                setCheckBonded(true);
                const bonded = await deviceUtils.checkDeviceBonded(
                  device.connectId ?? '',
                );
                if (bonded) {
                  setCheckBonded(false);
                  deviceUtils.connect(device.connectId ?? '').then((r) => {
                    setTimeout(() => finishConnected(r), 1000);
                  });
                }
              }
              break;
            }
            default:
              break;
          }
        });
    },
    [navigation, checkBonded],
  );

  const renderDevices = useCallback(() => {
    if (!devices?.length) return null;
    return (
      <VStack space={4} w="full">
        <Typography.Body2 color="text-subdued" textAlign="center">
          {intl.formatMessage({ id: 'modal__looking_for_devices_result' })}
        </Typography.Body2>
        {devices.map((device, index) => (
          <PressableItem
            p="4"
            key={`${index}-${device?.connectId ?? ''}`}
            bg="surface-default"
            borderRadius="12px"
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            disabled={!!device.wallet}
            onPress={() => {
              handleConnectDeviceWithDevice(device);
            }}
          >
            <HStack space={3} alignItems="center">
              {/* TODO: Different type of icon */}
              <Image
                source={getDeviceIcon(device.deviceType)}
                width={6}
                height={36}
              />
              <Typography.Body1>{device.name}</Typography.Body1>
            </HStack>

            {device.wallet ? (
              <HStack alignItems="center">
                <Badge
                  size="sm"
                  title={intl.formatMessage({ id: 'content__existing' })}
                  type="success"
                />
              </HStack>
            ) : (
              <HStack space={3} alignItems="center">
                {isConnectingDeviceId === device.connectId && (
                  <Spinner size="sm" />
                )}
                <Icon name="ChevronRightOutline" />
              </HStack>
            )}
          </PressableItem>
        ))}
      </VStack>
    );
  }, [devices, handleConnectDeviceWithDevice, isConnectingDeviceId, intl]);

  // Mobile Connect Screen
  const renderConnectScreen = () => {
    if (!isSearching) {
      return (
        <VStack space={8} w="full" alignItems="center">
          <Box size="358px">
            <Image size="358px" source={KeepDeviceAroundSource} />
          </Box>

          <VStack space={2} alignItems="center">
            <Typography.DisplayLarge>
              {intl.formatMessage({ id: 'modal__keep_device_close' })}
            </Typography.DisplayLarge>
            <Typography.Body1 color="text-subdued" textAlign="center">
              {intl.formatMessage({ id: 'model__keep_device_close_desc' })}
            </Typography.Body1>
          </VStack>
        </VStack>
      );
    }
    return (
      <ScrollView>
        <VStack space={12} w="full" alignItems="center">
          <Box w="358px" h="220px" mb={-4}>
            <LottieView
              // eslint-disable-next-line global-require
              source={require('@onekeyhq/kit/assets/wallet/lottie_connect_onekey_by_bluetooth.json')}
              autoPlay
              loop
            />
          </Box>

          <VStack space={2} alignItems="center">
            <Typography.DisplayLarge>
              {intl.formatMessage({ id: 'modal__looking_for_devices' })}
            </Typography.DisplayLarge>
            <Typography.Body1 color="text-subdued" textAlign="center">
              {intl.formatMessage({ id: 'modal__looking_for_devices_desc' })}
            </Typography.Body1>
          </VStack>

          {renderDevices()}
        </VStack>
      </ScrollView>
    );
  };

  const content = platformEnv.isNative ? (
    <Center>{renderConnectScreen()}</Center>
  ) : (
    <VStack space={8} alignItems="center">
      <Box>
        <LottieView
          // eslint-disable-next-line global-require
          source={require('@onekeyhq/kit/assets/wallet/lottie_connect_onekey_by_usb.json')}
          autoPlay
          loop
        />
      </Box>

      <Typography.DisplayMedium>
        {intl.formatMessage({ id: 'modal__connect_your_device' })}
      </Typography.DisplayMedium>
      {renderDevices()}
    </VStack>
  );

  return (
    <Modal
      scrollViewProps={{
        children: content,
        contentContainerStyle: {
          height: '100%',
          justifyContent: 'center',
          paddingBottom: 24,
        },
      }}
      hidePrimaryAction={!platformEnv.isNative}
      footer={!platformEnv.isNative || isSearching ? null : undefined}
      primaryActionTranslationId="action__connect_device"
      onPrimaryActionPress={handleScanDevice}
      hideSecondaryAction
    />
  );
};

export default ConnectHardwareModal;
