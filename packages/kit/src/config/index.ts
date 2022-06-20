/* eslint-disable @typescript-eslint/no-non-null-assertion */
export const MAX_PAGE_CONTAINER_WIDTH = 1024;

/**
 * Tokens will injected at build process. These are client token.
 */
export const COVALENT_API_KEY = process.env.COVALENT_KEY!;
export const OPENSEA_API_KEY = process.env.OPENSEA_KEY!;
export const MOONPAY_API_KEY = process.env.MOONPAY_KEY!;

export const HARDWARE_SDK_IFRAME_SRC =
  process.env.HARDWARE_SDK_CONNECT_SRC || 'https://hardware-sdk.onekey.so/';
