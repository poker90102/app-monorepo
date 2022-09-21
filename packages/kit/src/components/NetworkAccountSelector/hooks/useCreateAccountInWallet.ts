import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import { useToast } from '@onekeyhq/components';
import { OnekeyNetwork } from '@onekeyhq/engine/src/presets/networkIds';
import { IAccount } from '@onekeyhq/engine/src/types';
import { Network } from '@onekeyhq/engine/src/types/network';
import { Wallet } from '@onekeyhq/engine/src/types/wallet';
import { IVaultSettings } from '@onekeyhq/engine/src/vaults/types';
import debugLogger from '@onekeyhq/shared/src/logger/debugLogger';

import backgroundApiProxy from '../../../background/instance/backgroundApiProxy';
import { useNavigation } from '../../../hooks';
import { usePromiseResult } from '../../../hooks/usePromiseResult';
import {
  CreateAccountModalRoutes,
  CreateWalletModalRoutes,
  ModalRoutes,
  RootRoutes,
} from '../../../routes/routesEnum';
import { wait } from '../../../utils/helper';
import { useAddExternalAccount } from '../../WalletConnect/useAddExternalAccount';
import { useWalletConnectQrcodeModal } from '../../WalletConnect/useWalletConnectQrcodeModal';

export const AllNetwork = 'all';
export const NETWORK_NOT_SUPPORT_CREATE_ACCOUNT_I18N_KEY =
  'content__str_chain_is_unsupprted';

export function useCreateAccountInWallet({
  networkId,
  walletId,
}: {
  networkId?: string;
  walletId?: string;
}) {
  const { engine, serviceAccountSelector } = backgroundApiProxy;
  const navigation = useNavigation();
  const toast = useToast();
  const intl = useIntl();
  const { connectToWallet } = useWalletConnectQrcodeModal();
  const addExternalAccount = useAddExternalAccount();

  const { result: walletAndNetworkInfo } = usePromiseResult(async () => {
    const selectedNetworkId =
      !networkId || networkId === AllNetwork ? undefined : networkId;

    let network: Network | undefined;
    let activeWallet: Wallet | undefined;
    let vaultSettings: IVaultSettings | undefined;

    if (selectedNetworkId) {
      network = await engine.getNetwork(selectedNetworkId);
      vaultSettings = await engine.getVaultSettings(selectedNetworkId);
    }
    if (walletId) {
      activeWallet = await engine.getWallet(walletId);
    }

    let isCreateAccountSupported = false;
    if (network?.id) {
      if (
        activeWallet?.type === 'external' &&
        vaultSettings?.externalAccountEnabled
      ) {
        isCreateAccountSupported = true;
      }
      if (
        activeWallet?.type === 'imported' &&
        vaultSettings?.importedAccountEnabled
      ) {
        isCreateAccountSupported = true;
      }
      if (
        activeWallet?.type === 'watching' &&
        vaultSettings?.watchingAccountEnabled
      ) {
        isCreateAccountSupported = true;
      }
      if (
        activeWallet?.type === 'hw' &&
        vaultSettings?.hardwareAccountEnabled
      ) {
        isCreateAccountSupported = true;
      }
      if (activeWallet?.type === 'hd') {
        isCreateAccountSupported = true;
      }
    } else {
      // AllNetwork
      isCreateAccountSupported = true;
    }

    return {
      selectedNetworkId,
      network,
      activeWallet,
      vaultSettings,
      isCreateAccountSupported,
    };
  }, [networkId, walletId]);

  const createAccount = useCallback(async () => {
    if (!walletId) {
      return;
    }
    const {
      activeWallet,
      vaultSettings,
      network,
      selectedNetworkId,
      isCreateAccountSupported,
    } = walletAndNetworkInfo ?? {};
    const showNotSupportToast = () => {
      toast.show({
        title: intl.formatMessage(
          {
            id: NETWORK_NOT_SUPPORT_CREATE_ACCOUNT_I18N_KEY,
          },
          { 0: network?.shortName },
        ),
      });
    };
    if (!isCreateAccountSupported) {
      showNotSupportToast();
      return;
    }
    if (activeWallet?.type === 'external') {
      let isConnected = false;
      let addedAccount: IAccount | undefined;
      try {
        const result = await connectToWallet({
          isNewSession: true,
        });
        isConnected = true;

        // refresh accounts in drawer list
        await serviceAccountSelector.preloadingCreateAccount({
          walletId: activeWallet.id,
          networkId: network?.id || OnekeyNetwork.eth,
        });

        addedAccount = await addExternalAccount(result);
      } catch (error) {
        debugLogger.common.error(error);
      } finally {
        await wait(2000);

        if (isConnected) {
          // refresh accounts in drawer list after created

          await serviceAccountSelector.preloadingCreateAccountDone({
            walletId: activeWallet.id,
            networkId: network?.id || OnekeyNetwork.eth,
            accountId: addedAccount?.id,
          });
        }
      }
      return;
    }
    if (activeWallet?.type === 'imported') {
      if (network?.id && !vaultSettings?.importedAccountEnabled) {
        showNotSupportToast();
        return;
      }
      return navigation.navigate(RootRoutes.Modal, {
        screen: ModalRoutes.CreateWallet,
        params: {
          screen: CreateWalletModalRoutes.AddExistingWalletModal,
          params: { mode: 'imported', wallet: activeWallet },
        },
      });
    }
    if (activeWallet?.type === 'watching') {
      if (network?.id && !vaultSettings?.watchingAccountEnabled) {
        showNotSupportToast();
        return;
      }
      return navigation.navigate(RootRoutes.Modal, {
        screen: ModalRoutes.CreateWallet,
        params: {
          screen: CreateWalletModalRoutes.AddExistingWalletModal,
          params: { mode: 'watching', wallet: activeWallet },
        },
      });
    }

    return navigation.navigate(RootRoutes.Modal, {
      screen: ModalRoutes.CreateAccount,
      params: {
        screen: CreateAccountModalRoutes.CreateAccountForm,
        params: {
          walletId: activeWallet?.id || '',
          selectedNetworkId,
        },
      },
    });
  }, [
    addExternalAccount,
    connectToWallet,
    intl,
    navigation,
    serviceAccountSelector,
    toast,
    walletAndNetworkInfo,
    walletId,
  ]);
  return {
    createAccount,
    isCreateAccountSupported: walletAndNetworkInfo?.isCreateAccountSupported,
  };
}
