import { Page } from '@playwright/test';

export interface FreighterMock {
  isConnected: () => Promise<{ isConnected: boolean }>
  getAddress: () => Promise<{ address: string }>
  requestAccess: () => Promise<{ address: string }>
  signTransaction: (xdr: string) => Promise<{ signedTxXdr: string }>
  getNetwork: () => Promise<{ network: string }>
}

declare global {
  interface Window {
    freighter?: FreighterMock
  }
}

/**
 * Mocks the Freighter wallet API on the window object.
 */
export async function mockFreighter(page: Page, address: string) {
  await page.addInitScript((mockAddress: string) => {
    // Mock the global freighter object if needed,
    // but @stellar/freighter-api actually uses window.freighter or similar internally.
    // We can also mock the individual functions if they are exported from a module.
    // However, since we are testing the built app, we need to mock what the library expects.
    window.freighter = {
      isConnected: () => Promise.resolve({ isConnected: true }),
      getAddress: () => Promise.resolve({ address: mockAddress }),
      requestAccess: () => Promise.resolve({ address: mockAddress }),
      signTransaction: (xdr: string) => Promise.resolve({ signedTxXdr: xdr }), // Return unsigned for simplicity in mock
      getNetwork: () => Promise.resolve({ network: 'TESTNET' }),
    };
  }, address);
}
