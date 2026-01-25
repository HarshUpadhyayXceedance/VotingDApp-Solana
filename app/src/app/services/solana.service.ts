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

  private programInstance: any = null;
  private lastWalletAddress: string | null = null;

  constructor(private walletService: WalletService) {}

  async getProgram(): Promise<any | null> {
    if (!this.isBrowser) {
      console.log('⚠️ Not in browser, skipping program creation');
      return null;
    }

    // Refresh wallet state first
    await this.walletService.refreshWalletState();

    const phantom = this.walletService.phantom;
    if (!phantom || !phantom.publicKey) {
      console.log('⚠️ Wallet not connected');
      return null;
    }

    const currentWalletAddress = phantom.publicKey.toString();

    // If wallet changed, clear the cached program
    if (this.lastWalletAddress && this.lastWalletAddress !== currentWalletAddress) {
      console.log('🔄 Wallet changed, clearing program cache');
      this.programInstance = null;
    }

    this.lastWalletAddress = currentWalletAddress;

    // Return cached program if available and wallet hasn't changed
    if (this.programInstance) {
      console.log('✅ Using cached program instance');
      return this.programInstance;
    }

    try {
      console.log('📦 Creating new program instance...');
      console.log('   Wallet:', currentWalletAddress);
      
      // ✅ Dynamic import Anchor only in browser
      const anchor = await import('@coral-xyz/anchor');

      // Verify Anchor imported correctly
      if (!anchor.AnchorProvider || !anchor.Program) {
        throw new Error('Failed to import Anchor classes');
      }

      // ✅ Create wallet adapter
      const wallet: BrowserWallet = {
        publicKey: new PublicKey(phantom.publicKey.toString()),
        signTransaction: phantom.signTransaction.bind(phantom),
        signAllTransactions: phantom.signAllTransactions.bind(phantom),
      };

      // ✅ Create provider with proper commitment levels
      const provider = new anchor.AnchorProvider(
        this.connection,
        wallet as any,
        { 
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
          skipPreflight: false
        }
      );

      // Verify provider was created
      if (!provider.publicKey) {
        throw new Error('Provider missing public key');
      }

      // ✅ Create and cache program instance
      this.programInstance = new anchor.Program(
        idl as any,
        provider
      );

      console.log('✅ Program instance created successfully');
      console.log('   Program ID:', this.programInstance.programId.toString());
      console.log('   Provider Wallet:', provider.publicKey.toString());

      return this.programInstance;

    } catch (error: any) {
      console.error('❌ Error creating program:', error);
      
      // Provide helpful error messages
      if (error.message?.includes('Failed to import')) {
        console.error('💡 Anchor import failed - check package installation');
      } else if (error.message?.includes('Provider missing')) {
        console.error('💡 Wallet provider issue - try reconnecting wallet');
      }
      
      return null;
    }
  }

  getConnection() {
    return this.connection;
  }

  // Clear program instance (useful for wallet changes)
  clearProgram() {
    console.log('🗑️ Clearing program cache');
    this.programInstance = null;
    this.lastWalletAddress = null;
  }

  // Check if program is ready
  isProgramReady(): boolean {
    return !!this.programInstance;
  }

  // Get current wallet from program
  getCurrentWallet(): string | null {
    return this.lastWalletAddress;
  }
}