import React from 'react';

import { useIntl } from 'react-intl';

import { Box } from '@onekeyhq/components';
import { shortenAddress } from '@onekeyhq/components/src/utils';
import {
  IDecodedTxActionType,
  IDecodedTxDirection,
} from '@onekeyhq/engine/src/vaults/types';

import { TxDetailActionBoxAutoTransform } from '../components/TxDetailActionBoxAutoTransform';
import { TxListActionBox } from '../components/TxListActionBox';
import { TxStatusBarInList } from '../components/TxStatusBar';
import { TxActionElementAddressNormal } from '../elements/TxActionElementAddress';
import { TxActionElementAmountNormal } from '../elements/TxActionElementAmount';
import { TxActionElementNFT } from '../elements/TxActionElementNFT';
import {
  ITxActionCardProps,
  ITxActionElementDetail,
  ITxActionMetaIcon,
  ITxActionMetaTitle,
} from '../types';

const NOBODY = '0x0000000000000000000000000000000000000000';

function getTitleInfo({
  type,
  send,
  receive,
  account,
}: {
  type: IDecodedTxActionType;
  send: string;
  receive: string;
  account: string;
}): ITxActionMetaTitle | undefined {
  if (send === account && receive === NOBODY) {
    return {
      title: 'Burn',
    };
  }
  if (send === NOBODY && receive === account) {
    return {
      title: 'Mint',
    };
  }
  if (type === IDecodedTxActionType.NFT_SALE) {
    if (send === account) {
      return {
        titleKey: 'action__sell',
      };
    }
    if (receive === account) {
      return {
        titleKey: 'action__buy',
      };
    }
  }
  if (type === IDecodedTxActionType.NFT_TRANSFER) {
    if (send === account) {
      return {
        titleKey: 'action__send',
      };
    }
    if (receive === account) {
      return {
        titleKey: 'action__receive',
      };
    }
  }
  return undefined;
}

export function getTxActionNFTTransferInfo(props: ITxActionCardProps) {
  const { action, decodedTx } = props;
  const { nftTransfer } = action;
  const account = decodedTx.owner;

  const amount = nftTransfer?.amount ?? '0';
  const symbol = nftTransfer?.asset.contractName ?? '';
  const send = nftTransfer?.send ?? '';
  const receive = nftTransfer?.receive ?? '';
  const displayDecimals: number | undefined = 100;

  let direction = IDecodedTxDirection.OTHER;
  if (send === receive && send === account) {
    direction = IDecodedTxDirection.SELF;
  }
  if (send && send === account) {
    direction = IDecodedTxDirection.OUT;
  }
  if (receive && receive === account) {
    direction = IDecodedTxDirection.IN;
  }
  action.direction = direction;

  const isOut =
    direction === IDecodedTxDirection.OUT ||
    direction === IDecodedTxDirection.SELF ||
    direction === IDecodedTxDirection.OTHER;
  const titleInfo = getTitleInfo({ type: action.type, send, receive, account });

  const iconUrl = nftTransfer?.asset.collection.logoUrl;
  let iconInfo: ITxActionMetaIcon | undefined;
  if (iconUrl) {
    iconInfo = {
      icon: {
        url: iconUrl,
      },
    };
  }

  return {
    titleInfo,
    iconInfo,
    amount,
    symbol,
    displayDecimals,
    send,
    receive,
    isOut,
  };
}

export function TxActionNFTTransfer(props: ITxActionCardProps) {
  const { action, meta, decodedTx } = props;
  const intl = useIntl();

  const { amount, symbol, send, receive } = getTxActionNFTTransferInfo(props);

  const details: ITxActionElementDetail[] = [
    {
      title: intl.formatMessage({ id: 'content__from' }),
      content: <TxActionElementAddressNormal address={send} />,
    },
    {
      title: intl.formatMessage({ id: 'content__to' }),
      content: <TxActionElementAddressNormal address={receive} />,
    },
  ];

  return (
    <TxDetailActionBoxAutoTransform
      decodedTx={decodedTx}
      iconInfo={meta?.iconInfo}
      titleInfo={meta?.titleInfo}
      amountInfo={{
        direction: action.direction,
        amount,
        symbol,
      }}
      details={details}
    />
  );
}

export function TxActionNFTTransferT0(props: ITxActionCardProps) {
  const { action, meta, decodedTx, historyTx } = props;
  const { amount, symbol, send, receive, isOut, displayDecimals } =
    getTxActionNFTTransferInfo(props);
  const { nftTransfer } = action;

  const statusBar = (
    <Box flexDirection="column" mt="8px">
      {nftTransfer?.asset && (
        <Box width="full" height="96px">
          <TxActionElementNFT asset={nftTransfer?.asset} />
        </Box>
      )}
      <TxStatusBarInList decodedTx={decodedTx} historyTx={historyTx} />
    </Box>
  );
  return (
    <TxListActionBox
      footer={statusBar}
      iconInfo={meta?.iconInfo}
      titleInfo={meta?.titleInfo}
      content={
        <TxActionElementAmountNormal
          textAlign="right"
          justifyContent="flex-end"
          amount={amount}
          symbol={symbol}
          decimals={displayDecimals}
          direction={action.direction}
        />
      }
      subTitle={isOut ? shortenAddress(receive) : shortenAddress(send)}
    />
  );
}
