import { getFiatEndpoint } from '@onekeyhq/engine/src/endpoint';
import { OnekeyNetwork } from '@onekeyhq/engine/src/presets/networkIds';

export const swftcCustomerSupportUrl =
  'https://www.bangwo8.com/osp2016/im/pc/index.php?vendorID=782460&uid=&customSource=onekey';

export enum Chains {
  MAINNET = '1',
  ROPSTEN = '3',
  OPTIMISM = '10',
  KOVAN = '42',
  BSC = '56',
  POLYGON = '137',
  FANTOM = '250',
  AVALANCHE = '43114',
  CELO = '42220',
  HECO = '128',
  GNOSIS = '100',
  OKEX = '66',
}

export const enabledNetworkIds: string[] = [
  OnekeyNetwork.btc,
  OnekeyNetwork.eth,
  OnekeyNetwork.bsc,
  OnekeyNetwork.polygon,
  OnekeyNetwork.heco,
  OnekeyNetwork.optimism,
  OnekeyNetwork.xdai,
  OnekeyNetwork.fantom,
  OnekeyNetwork.arbitrum,
  OnekeyNetwork.celo,
  OnekeyNetwork.avalanche,
  OnekeyNetwork.aurora,
  OnekeyNetwork.sol,
  OnekeyNetwork.teth,
  'evm--42',
];

const serverURL = 'https://0x.onekey.so';

export const networkRecords: Record<string, string> = {
  get [Chains.MAINNET]() {
    return `${getFiatEndpoint()}/0x/quote?chainID=ethereum`;
  },
  get [Chains.ROPSTEN]() {
    return `${getFiatEndpoint()}/0x/quote?chainID=ropsten`;
  },
  get [Chains.BSC]() {
    return `${getFiatEndpoint()}/0x/quote?chainID=bsc`;
  },
  get [Chains.POLYGON]() {
    return `${getFiatEndpoint()}/0x/quote?chainID=polygon`;
  },
  get [Chains.FANTOM]() {
    return `${getFiatEndpoint()}/0x/quote?chainID=fantom`;
  },
  get [Chains.AVALANCHE]() {
    return `${getFiatEndpoint()}/0x/quote?chainID=avalanche`;
  },
  get [Chains.CELO]() {
    return `${getFiatEndpoint()}/0x/quote?chainID=celo`;
  },
  get [Chains.OPTIMISM]() {
    return `${getFiatEndpoint()}/0x/quote?chainID=optimism`;
  },
  [Chains.KOVAN]: 'https://kovan.api.0x.org/swap/v1/quote',
  [Chains.HECO]: `${serverURL}/swap/v1/quote`,
};

export const arrivalTimeValues: Record<string, number> = {
  [Chains.MAINNET]: 60,
  [Chains.ROPSTEN]: 15,
  [Chains.KOVAN]: 15,
  [Chains.BSC]: 30,
  [Chains.POLYGON]: 30,
  [Chains.FANTOM]: 30,
  [Chains.AVALANCHE]: 30,
  [Chains.CELO]: 60,
  [Chains.OPTIMISM]: 60,
  [Chains.HECO]: 15,
};
