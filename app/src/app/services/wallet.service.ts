import { Injectable } from '@angular/core';
import { PublicKey } from '@solana/web3.js';

declare global {
  interface Window {
    solana?: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private _wallet: any = null;

  get phantom() {
    return this._wallet;
  }

  get publicKey(): PublicKey | null {
    return this._wallet?.publicKey ?? null;
  }

  async connect(): Promise<string | null> {
    if (!window.solana || !window.solana.isPhantom) {
      alert('Phantom wallet not found');
      return null;
    }

    this._wallet = window.solana;
    const res = await this._wallet.connect();
    return res.publicKey?.toString() ?? null;
  }

  async disconnect(): Promise<void> {
    if (this._wallet?.disconnect) {
      await this._wallet.disconnect();
    }
    this._wallet = null;
  }

  isConnected(): boolean {
    return !!this.publicKey;
  }
}
