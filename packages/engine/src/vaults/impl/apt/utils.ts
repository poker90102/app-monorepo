import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import {
  SignedTx,
  UnsignedTx,
} from '@onekeyfe/blockchain-libs/dist/types/provider';
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/naming-convention */
import {
  AptosClient,
  BCS,
  MaybeHexString,
  TransactionBuilder,
  TxnBuilderTypes,
  Types,
} from 'aptos';
import { get } from 'lodash';

import { OneKeyError, OneKeyHardwareError } from '../../../errors';
import { IDecodedTxActionType } from '../../types';
import { hexlify, stripHexPrefix } from '../../utils/hexUtils';

import { TypeTagParser } from './builder_utils';
import {
  ArgumentABI,
  SignMessagePayload,
  SignMessageResponse,
  TxPayload,
} from './types';

import type { Signer } from '../../../proxy';

// Move Module
export const APTOS_COINSTORE = '0x1::coin::CoinStore';
export const APTOS_COIN_INFO = '0x1::coin::CoinInfo';

// Move Action Module
export const APTOS_PUBLISH_MODULE = '0x1::code::publish_package_txn';
export const APTOS_TRANSFER_FUNC = '0x1::coin::transfer';
export const APTOS_TOKEN_REGISTER = '0x1::managed_coin::register';
export const APTOS_NFT_CREATE = '0x3::token::create_token_script';
export const APTOS_COLLECTION_CREATE = '0x3::token::create_collection_script';
export const APTOS_NFT_CLAIM = '0x3::token_transfers::claim_script';

export const APTOS_NATIVE_COIN = '0x1::aptos_coin::AptosCoin';
export const DEFAULT_GAS_LIMIT_NATIVE_TRANSFER = '2000';

const MAX_U64_BIG_INT = BigInt(9007199254740991);

const POLL_INTERVAL = 1500;
type IPollFn<T> = (time?: number, index?: number) => T;

export function getTransactionTypeByPayload({
  type,
  function_name,
  type_arguments,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  args,
}: {
  type: string;
  function_name?: string;
  type_arguments?: any[];
  args?: any[];
}) {
  if (type === 'entry_function_payload') {
    if (function_name === APTOS_TRANSFER_FUNC) {
      const [tokenName] = type_arguments || [];
      if (tokenName === APTOS_NATIVE_COIN) {
        return IDecodedTxActionType.NATIVE_TRANSFER;
      }
      return IDecodedTxActionType.TOKEN_TRANSFER;
    }
    if (function_name === APTOS_TOKEN_REGISTER) {
      return IDecodedTxActionType.TOKEN_ACTIVATE;
    }

    // TODO NFT transfer

    return IDecodedTxActionType.FUNCTION_CALL;
  }

  return IDecodedTxActionType.UNKNOWN;
}

export function getTransactionType(
  transaction: Types.Transaction,
): IDecodedTxActionType {
  // TODO other transaction type
  if (transaction.type === 'user_transaction') {
    const tx = transaction as Types.UserTransaction;

    return getTransactionTypeByPayload({
      type: tx.payload.type,
      // @ts-expect-error
      function_name: tx.payload.function,
      // @ts-expect-error
      type_arguments: tx.payload.type_arguments,
      // @ts-expect-error
      args: tx.payload.arguments,
    });
  }

  return IDecodedTxActionType.UNKNOWN;
}

export async function getTokenInfo(client: AptosClient, tokenAddress: string) {
  const [address] = tokenAddress.split('::');
  const { data } = await client.getAccountResource(
    address,
    `${APTOS_COIN_INFO}<${tokenAddress ?? APTOS_NATIVE_COIN}>`,
  );

  return Promise.resolve({
    name: get(data, 'name', ''),
    symbol: get(data, 'symbol', ''),
    decimals: get(data, 'decimals', 6),
  });
}

export async function generateSignTransaction(
  client: AptosClient,
  signer: Signer,
  sender: string,
  senderPublicKey: string,
  payload: TxPayload,
  bscTxn?: string,
  options?: {
    sequence_number?: string;
    max_gas_amount?: string;
    gas_unit_price?: string;
    expiration_timestamp_secs?: string;
    chain_id?: number;
  },
) {
  let rawTxn;
  if (bscTxn) {
    const deserializer = new BCS.Deserializer(hexToBytes(bscTxn));
    rawTxn = TxnBuilderTypes.RawTransaction.deserialize(deserializer);
  } else {
    if (!payload.function) {
      throw new OneKeyError('generate transaction error: function is empty');
    }
    // @ts-expect-error
    rawTxn = await client.generateTransaction(sender, payload, {
      sequence_number: options?.sequence_number,
      max_gas_amount: options?.max_gas_amount,
      gas_unit_price: options?.gas_unit_price,
      expiration_timestamp_secs: options?.expiration_timestamp_secs,
    });
  }

  const signingMessage = TransactionBuilder.getSigningMessage(rawTxn);
  const [signature] = await signer.sign(
    Buffer.from(bytesToHex(signingMessage), 'hex'),
  );

  const signatureHex = hexlify(signature, {
    noPrefix: true,
  });
  const txSignature = new TxnBuilderTypes.Ed25519Signature(
    hexToBytes(signatureHex),
  );

  const authenticator = new TxnBuilderTypes.TransactionAuthenticatorEd25519(
    new TxnBuilderTypes.Ed25519PublicKey(
      hexToBytes(stripHexPrefix(senderPublicKey)),
    ),
    txSignature,
  );

  const signRawTx = BCS.bcsToBytes(
    new TxnBuilderTypes.SignedTransaction(rawTxn, authenticator),
  );

  return Promise.resolve({
    txid: '',
    rawTx: bytesToHex(signRawTx),
  });
}

export async function signTransaction(
  client: AptosClient,
  unsignedTx: UnsignedTx,
  signer: Signer,
): Promise<SignedTx> {
  // IEncodedTxAptos
  const { encodedTx } = unsignedTx.payload;
  const {
    sequence_number,
    max_gas_amount,
    gas_unit_price,
    expiration_timestamp_secs,

    bscTxn,

    //  payload
    type,
    function: func,
    arguments: args,
    type_arguments,
    code,
  } = encodedTx;

  const senderPublicKey = unsignedTx.inputs?.[0]?.publicKey;
  let { sender } = encodedTx;
  if (!sender) {
    sender = unsignedTx.inputs?.[0]?.address;
  }

  if (!senderPublicKey) {
    throw new OneKeyHardwareError(Error('senderPublicKey is required'));
  }

  return generateSignTransaction(
    client,
    signer,
    sender,
    senderPublicKey,
    {
      type,
      function: func,
      arguments: args,
      type_arguments,
      code,
    },
    bscTxn,
    {
      sequence_number,
      max_gas_amount,
      gas_unit_price,
      expiration_timestamp_secs,
    },
  );
}

export function waitPendingTransaction(
  client: AptosClient,
  txHash: string,
  retryCount = 10,
): Promise<Types.Transaction | undefined> {
  let retry = 0;

  const poll: IPollFn<Promise<Types.Transaction | undefined>> = async (
    time = POLL_INTERVAL,
  ) => {
    retry += 1;

    let transaction: Types.Transaction | undefined;
    try {
      transaction = await client.getTransactionByHash(txHash);
    } catch (error: any) {
      const { errorCode } = error;
      return Promise.reject(new OneKeyError(errorCode));
    }

    const success = get(transaction, 'success', undefined);
    if (success === true) {
      return Promise.resolve(transaction);
    }
    if (success === false) {
      return Promise.reject(
        new OneKeyError(get(transaction, 'vm_status', undefined)),
      );
    }
    if (retry > retryCount) {
      return Promise.resolve(transaction);
    }

    return new Promise(
      (resolve: (p: Promise<Types.Transaction | undefined>) => void) =>
        setTimeout(() => resolve(poll(time)), time),
    );
  };

  return poll();
}

export async function getAccountCoinResource(
  client: AptosClient,
  address: string,
  tokenAddress?: string | undefined,
): Promise<Types.MoveResource | undefined> {
  // The coin type to use, defaults to 0x1::aptos_coin::AptosCoin
  const typeTag = `${APTOS_COINSTORE}<${tokenAddress ?? APTOS_NATIVE_COIN}>`;
  const resources = await client.getAccountResources(stripHexPrefix(address));
  const accountResource = resources.find((r) => r.type === typeTag);
  return Promise.resolve(accountResource);
}

export async function getModuleAbiMap(aptosClient: AptosClient, addr: string) {
  const modules = await aptosClient.getAccountModules(addr);
  const abis = modules
    .map((module) => module.abi)
    .flatMap((abi) =>
      abi?.exposed_functions
        .filter((ef) => ef.is_entry)
        .map((ef) => ({
          fullName: `${abi.address}::${abi.name}::${ef.name}`,
          ...ef,
        })),
    );

  const abiMap = new Map<string, Types.MoveFunction & { fullName: string }>();
  abis.forEach((abi) => {
    if (abi) {
      abiMap.set(abi.fullName, abi);
    }
  });

  return abiMap;
}

/**
 * 0x1::aptos_coin::AptosCoin
 * // Vectors are in format `vector<other_tag_string>`
 * vector<0x1::aptos_coin::AptosCoin>
 * bool
 * u8
 * u64
 * u128
 * address
 */
export function decodeTypeArgument(t: TxnBuilderTypes.TypeTag): string {
  if (t instanceof TxnBuilderTypes.TypeTagStruct) {
    const { address, module_name, name } = t.value;
    return `${hexlify(address?.address, {
      removeZeros: true,
    })}::${module_name?.value}::${name?.value}`;
  }
  if (t instanceof TxnBuilderTypes.TypeTagVector) {
    return `vector<${decodeTypeArgument(t.value)}>`;
  }
  if (t instanceof TxnBuilderTypes.TypeTagU8) {
    return 'u8';
  }
  if (t instanceof TxnBuilderTypes.TypeTagU64) {
    return 'u64';
  }
  if (t instanceof TxnBuilderTypes.TypeTagU128) {
    return 'u128';
  }
  if (t instanceof TxnBuilderTypes.TypeTagBool) {
    return 'bool';
  }
  if (t instanceof TxnBuilderTypes.TypeTagAddress) {
    return 'address';
  }
  throw new Error('Invalid type tag.');
}

export function deserializeVector(
  deserializer: BCS.Deserializer,
  cls: any,
): any[] {
  const length = deserializer.deserializeUleb128AsU32();
  const list: Array<typeof cls> = [];
  for (let i = 0; i < length; i += 1) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      list.push(cls.deserialize(deserializer));
    } catch (e) {
      console.log(e);
    }
  }
  return list;
}

export function decodeArgument(
  typeTag: TxnBuilderTypes.TypeTag,
  argument: Uint8Array,
): any {
  const deserializer = new BCS.Deserializer(argument);

  if (typeTag instanceof TxnBuilderTypes.TypeTagBool) {
    return deserializer.deserializeBool();
  }
  if (typeTag instanceof TxnBuilderTypes.TypeTagU8) {
    return deserializer.deserializeU8();
  }
  if (typeTag instanceof TxnBuilderTypes.TypeTagU64) {
    return deserializer.deserializeU64();
  }
  if (typeTag instanceof TxnBuilderTypes.TypeTagU128) {
    return deserializer.deserializeU128();
  }
  if (typeTag instanceof TxnBuilderTypes.TypeTagAddress) {
    const hex = deserializer.deserializeFixedBytes(
      TxnBuilderTypes.AccountAddress.LENGTH,
    );
    return hexlify(hex, { removeZeros: true });
  }
  if (typeTag instanceof TxnBuilderTypes.TypeTagVector) {
    const { value: typeTagValue } = typeTag;
    const length = deserializer.deserializeUleb128AsU32();

    // leb128 encoded length
    let value = length;
    const valueArray = [];
    // eslint-disable-next-line no-bitwise
    while (value >>> 7 !== 0) {
      // eslint-disable-next-line no-bitwise
      valueArray.push((value & 0x7f) | 0x80);
      // eslint-disable-next-line no-bitwise
      value >>>= 7;
    }
    valueArray.push(value);

    // element length
    const vectorLength = (argument.length - valueArray.length) / length;

    const list: any[] = [];
    for (let i = 0; i < length; i += 1) {
      const indexValue = deserializer.deserializeFixedBytes(vectorLength);
      list.push(decodeArgument(typeTagValue, indexValue));
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return list;
  }
  if (typeTag instanceof TxnBuilderTypes.TypeTagStruct) {
    return deserializer.deserializeStr();
  }
  throw new Error('Invalid type tag.');
}

export function decodeArguments(
  originalArgs: string[] | undefined,
  args: Uint8Array[],
): any[] {
  if (!originalArgs) return [];
  const typeArgABIs = originalArgs.map(
    (arg, i) =>
      new ArgumentABI(`var${i}`, new TypeTagParser(arg).parseTypeTag()),
  );

  return args.map((argument, index) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return decodeArgument(typeArgABIs[index]?.type_tag, argument);
    } catch (error) {
      console.log(error);
    }
    return '';
  });
}

export async function transactionPayloadToTxPayload(
  aptosClient: AptosClient,
  payload: TxnBuilderTypes.TransactionPayload,
): Promise<TxPayload> {
  if (payload instanceof TxnBuilderTypes.EntryFunction) {
    const { module_name, function_name, ty_args, args } = payload;

    const func = `${hexlify(module_name?.address?.address, {
      removeZeros: true,
    })}::${module_name?.name?.value}::${function_name?.value}`;

    const type_arguments = ty_args?.map((t) => decodeTypeArgument(t));

    const [addr] = func.split('::');

    const abiMap = await getModuleAbiMap(aptosClient, addr);
    const funcAbi = abiMap.get(func);
    const originalArgs = funcAbi?.params?.filter(
      (param) => param !== 'signer' && param !== '&signer',
    );

    const values = decodeArguments(originalArgs, args);

    return {
      type: 'entry_function_payload',
      function: func,
      arguments: values,
      type_arguments,
    };
  }
  // TODO: TxnBuilderTypes.TransactionPayloadScript、TransactionPayloadModuleBundle
  throw new OneKeyHardwareError(Error('not support'));
}

export function formatSignMessage(
  message: SignMessagePayload,
  address: string,
  application: string,
  chainId: number,
): SignMessageResponse {
  const response: SignMessageResponse = {
    message: message.message,
    nonce: message.nonce,
    prefix: 'APTOS',
    signature: '',
    fullMessage: '',
  };

  let fullMessage = `${response.prefix}\n`;
  if (message.address) {
    fullMessage += `address: ${address}\n`;
    response.address = address;
  }
  if (message.chainId) {
    fullMessage += `chain_id: ${chainId}\n`;
    response.chainId = chainId;
  }
  if (message.application) {
    fullMessage += `application: ${application}\n`;
    response.application = application;
  }
  fullMessage += `message: ${message.message}\n`;
  fullMessage += `nonce: ${message.nonce}`;

  response.fullMessage = fullMessage;

  return response;
}

export function generateRegisterToken(tokenAddress: string): TxPayload {
  return {
    type: 'entry_function_payload',
    function: APTOS_TOKEN_REGISTER,
    arguments: [],
    type_arguments: [tokenAddress],
  };
}

export function generateTransferCoin(
  to: string,
  amount: string,
  tokenAddress?: string,
): TxPayload {
  return {
    type: 'entry_function_payload',
    function: APTOS_TRANSFER_FUNC,
    arguments: [to, amount],
    type_arguments: [tokenAddress ?? APTOS_NATIVE_COIN],
  };
}

export function generateTransferCreateCollection(
  account: string,
  name: string,
  description: string,
  uri: string,
  maxAmount: BCS.AnyNumber = MAX_U64_BIG_INT,
): TxPayload {
  return {
    type: 'entry_function_payload',
    function: APTOS_COLLECTION_CREATE,
    type_arguments: [],
    arguments: [name, description, uri, maxAmount, [false, false, false]],
  };
}

export function generateTransferCreateNft(
  account: string,
  collectionName: string,
  name: string,
  description: string,
  supply: number,
  uri: string,
  max: BCS.AnyNumber = MAX_U64_BIG_INT,
  royalty_payee_address: MaybeHexString = account,
  royalty_points_denominator = 0,
  royalty_points_numerator = 0,
  property_keys: Array<string> = [],
  property_values: Array<string> = [],
  property_types: Array<string> = [],
): TxPayload {
  return {
    type: 'entry_function_payload',
    function: APTOS_NFT_CREATE,
    type_arguments: [],
    arguments: [
      collectionName,
      name,
      description,
      supply,
      max,
      uri,
      royalty_payee_address,
      royalty_points_denominator,
      royalty_points_numerator,
      [false, false, false, false, false],
      property_keys,
      property_values,
      property_types,
    ],
  };
}