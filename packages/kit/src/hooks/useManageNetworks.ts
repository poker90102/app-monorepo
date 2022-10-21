import { IMPL_CFX } from '@onekeyhq/engine/src/constants';
import { INetwork } from '@onekeyhq/engine/src/types';

import { makeSelector } from './redux';

export type IManageNetworks = {
  allNetworks: INetwork[];
  enabledNetworks: INetwork[];
};

const CHAINS_DISAPLYED_IN_DEV = [IMPL_CFX];
const emptyArray = Object.freeze([]);

export const { use: useManageNetworks, get: getManageNetworks } =
  makeSelector<IManageNetworks>((selector, { useMemo }) => {
    const { enable: devModeEnable } = selector(
      (s) => s?.settings?.devMode || {},
    );
    const networks = selector((s) => s.runtime.networks) ?? emptyArray;

    const [allNetworks, enabledNetworks] = useMemo(() => {
      const chainsToHide = devModeEnable ? [] : CHAINS_DISAPLYED_IN_DEV;
      const all = networks.filter(
        (network) => !chainsToHide.includes(network.impl),
      );
      const enabled = all.filter((network) => network.enabled);
      return [all, enabled];
    }, [devModeEnable, networks]);

    return {
      allNetworks,
      enabledNetworks,
    };
  });
