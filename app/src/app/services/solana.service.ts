import { Injectable, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Connection, PublicKey } from '@solana/web3.js';
import idl from '../assets/idl/voting.json';
import { WalletService } from './wallet.service';

// Declare Anchor as window global
declare global {
  interface Window {
    anchor?: any;
  }
}

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
  private initializationPromise: Promise<any> | null = null;

  constructor(private walletService: WalletService) {}

  async getProgram(): Promise<any | null> {
    if (!this.isBrowser) {
      console.log('⚠️ Not in browser, skipping program creation');
      return null;
    }

    // If already initializing, wait for that to complete
    if (this.initializationPromise) {
      console.log('⏳ Waiting for existing initialization...');
      return this.initializationPromise;
    }

    // Create initialization promise
    this.initializationPromise = this.initializeProgram();
    
    try {
      const program = await this.initializationPromise;
      return program;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async initializeProgram(): Promise<any | null> {
    try {
      // Wait for Anchor to be loaded from CDN
      await this.waitForAnchor();

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

      console.log('📦 Creating new program instance...');
      console.log('   Wallet:', currentWalletAddress);
      
      // Get Anchor from window
      const anchor = window.anchor;
      
      if (!anchor) {
        console.error('❌ window.anchor is undefined');
        console.log('   Check browser console for CDN loading errors');
        console.log('   Verify scripts in index.html are loading');
        throw new Error('Anchor not loaded. Please refresh the page.');
      }

      console.log('   Anchor available:', !!anchor);
      console.log('   Anchor.AnchorProvider:', !!anchor.AnchorProvider);
      console.log('   Anchor.Program:', !!anchor.Program);

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
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      
      // Clear failed instance
      this.programInstance = null;
      
      return null;
    }
  }

  private async waitForAnchor(timeout: number = 10000): Promise<void> {
    if (!this.isBrowser) return;

    console.log('⏳ Waiting for Anchor to load from CDN...');
    const start = Date.now();
    let attempts = 0;
    
    while (Date.now() - start < timeout) {
      attempts++;
      
      if (window.anchor) {
        console.log(`✅ Anchor loaded from CDN (attempt ${attempts}, took ${Date.now() - start}ms)`);
        console.log('   window.anchor:', typeof window.anchor);
        console.log('   AnchorProvider:', typeof window.anchor?.AnchorProvider);
        console.log('   Program:', typeof window.anchor?.Program);
        return;
      }
      
      // Log every second
      if (attempts % 10 === 0) {
        console.log(`   Still waiting for Anchor... (${Math.floor((Date.now() - start) / 1000)}s)`);
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.error('❌ Anchor failed to load from CDN after 10 seconds');
    console.error('   Possible causes:');
    console.error('   1. Network issues (check your internet connection)');
    console.error('   2. CDN is down (try refreshing the page)');
    console.error('   3. Script blocked by browser/extension (check browser console)');
    console.error('   4. index.html not updated (verify scripts are present)');
    
    throw new Error('Anchor failed to load from CDN. Please refresh the page.');
  }

  getConnection() {
    return this.connection;
  }

  clearProgram() {
    console.log('🗑️ Clearing program cache');
    this.programInstance = null;
    this.lastWalletAddress = null;
    this.initializationPromise = null;
  }

  isProgramReady(): boolean {
    return !!this.programInstance;
  }

  getCurrentWallet(): string | null {
    return this.lastWalletAddress;
  }

  async reconnect(): Promise<boolean> {
    console.log('🔄 Reconnecting program...');
    this.clearProgram();
    
    const program = await this.getProgram();
    return !!program;
  }
}