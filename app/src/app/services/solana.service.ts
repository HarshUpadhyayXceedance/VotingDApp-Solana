import { Injectable, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Connection, PublicKey } from '@solana/web3.js';
import idl from '../assets/idl/voting.json';
import { WalletService } from './wallet.service';

interface BrowserWallet {
  publicKey: PublicKey;
  signTransaction(tx: any): Promise<any>;
  signAllTransactions(txs: any[]): Promise<any[]>;
}

@Injectable({ providedIn: 'root' })
export class SolanaService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private readonly connection = new Connection(
    'https://api.devnet.solana.com',
    'confirmed'
  );

  constructor(private walletService: WalletService) {}

  async getProgram(): Promise<any | null> {
    if (!this.isBrowser) return null;

    const phantom = this.walletService.phantom;
    if (!phantom || !phantom.publicKey) return null;

    // ✅ Dynamic import (THIS is the key)
    const anchor = await import('@coral-xyz/anchor');

    const wallet: BrowserWallet = {
      publicKey: new PublicKey(phantom.publicKey.toString()),
      signTransaction: phantom.signTransaction.bind(phantom),
      signAllTransactions: phantom.signAllTransactions.bind(phantom),
    };

    const provider = new anchor.AnchorProvider(
      this.connection,
      wallet as any,
      { commitment: 'confirmed' }
    );

    return new anchor.Program(
      idl as any,
      provider
    );
  }

  getConnection() {
    return this.connection;
  }
}
