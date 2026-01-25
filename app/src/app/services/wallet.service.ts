import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PublicKey } from '@solana/web3.js';

declare global {
  interface Window {
    solana?: any;
    phantom?: any;
  }
}

interface WalletState {
  address: string;
  connected: boolean;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private _wallet: any = null;
  private isBrowser = false;
  private readonly STORAGE_KEY = 'solvote_wallet_state';
  private readonly STATE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      this.initializeService();
    }
  }

  private initializeService() {
    // Clean up any stale state on initialization
    this.cleanupStaleState();
    
    // Set up wallet event listeners
    this.setupWalletListeners();
    
    // Try to restore previous session
    this.restoreSession();
  }

  private setupWalletListeners() {
    if (typeof window === 'undefined') return;

    // Wait for Phantom to be ready
    setTimeout(() => {
      const provider = this.getProvider();
      if (!provider) return;

      try {
        // Connect event
        provider.on('connect', (publicKey: any) => {
          console.log('✅ Wallet connected via event:', publicKey.toString());
          this._wallet = provider;
          this.saveWalletState(publicKey.toString());
        });

        // Disconnect event
        provider.on('disconnect', () => {
          console.log('🔌 Wallet disconnected via event');
          this._wallet = null;
          this.clearWalletState();
        });

        // Account changed event
        provider.on('accountChanged', (publicKey: any) => {
          if (publicKey) {
            console.log('🔄 Account changed:', publicKey.toString());
            this._wallet = provider;
            this.saveWalletState(publicKey.toString());
          } else {
            console.log('🔌 Account disconnected');
            this._wallet = null;
            this.clearWalletState();
          }
        });
      } catch (error) {
        console.log('Note: Could not set up wallet listeners:', error);
      }
    }, 500);
  }

  private async restoreSession() {
    const savedState = this.getSavedWalletState();
    
    if (!savedState) {
      console.log('No saved wallet state found');
      return;
    }

    // Check if state is still valid
    const isExpired = Date.now() - savedState.timestamp > this.STATE_EXPIRY;
    
    if (isExpired) {
      console.log('Saved wallet state expired, clearing...');
      this.clearWalletState();
      return;
    }

    // Try to reconnect silently
    const provider = this.getProvider();
    if (!provider) {
      console.log('Phantom not available for session restore');
      this.clearWalletState();
      return;
    }

    try {
      // Check if Phantom is already connected
      if (provider.isConnected && provider.publicKey) {
        const currentAddress = provider.publicKey.toString();
        
        // Verify it matches saved state
        if (currentAddress === savedState.address) {
          this._wallet = provider;
          console.log('✅ Session restored:', currentAddress);
          return;
        } else {
          console.log('⚠️ Wallet address mismatch, clearing state');
          this.clearWalletState();
        }
      }
    } catch (error) {
      console.log('Could not restore session:', error);
      this.clearWalletState();
    }
  }

  get phantom() {
    return this._wallet;
  }

  get publicKey(): PublicKey | null {
    return this._wallet?.publicKey ?? null;
  }

  async connect(): Promise<string | null> {
    if (!this.isBrowser) {
      console.log('Not in browser environment');
      return null;
    }

    // Wait for Phantom to be ready
    await this.waitForPhantom();

    const provider = this.getProvider();
    if (!provider) {
      alert('Phantom wallet not found!\n\nPlease install Phantom wallet extension from phantom.app');
      window.open('https://phantom.app/', '_blank');
      return null;
    }

    try {
      // Check if already connected
      if (provider.isConnected && provider.publicKey) {
        console.log('✅ Already connected to Phantom');
        this._wallet = provider;
        const address = provider.publicKey.toString();
        this.saveWalletState(address);
        return address;
      }

      console.log('🔐 Requesting connection to Phantom...');
      
      // Clear any existing state before new connection
      this.clearWalletState();
      
      // Request fresh connection
      const response = await provider.connect({ onlyIfTrusted: false });
      
      if (!response?.publicKey) {
        throw new Error('No public key returned from wallet');
      }

      this._wallet = provider;
      const address = response.publicKey.toString();
      
      // Save the new connection state
      this.saveWalletState(address);
      
      console.log('✅ Wallet connected successfully:', address);
      return address;

    } catch (error: any) {
      console.error('❌ Wallet connection error:', error);
      
      // Clear any partial state on error
      this.clearWalletState();
      
      if (error.code === 4001 || error.message?.includes('User rejected')) {
        alert('Connection request was rejected. Please try again and approve the connection in Phantom.');
        return null;
      }
      
      if (error.message?.includes('Unexpected error')) {
        alert(
          'Phantom wallet encountered an error. Please try:\n\n' +
          '1. Lock and unlock your Phantom wallet\n' +
          '2. Refresh this page\n' +
          '3. If issue persists, restart your browser'
        );
        return null;
      }
      
      alert(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isBrowser || !this._wallet) {
      return;
    }

    try {
      // Clear saved state first
      this.clearWalletState();
      
      // Disconnect from Phantom
      if (this._wallet.disconnect) {
        await this._wallet.disconnect();
      }
      
      this._wallet = null;
      console.log('✅ Wallet disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      // Force clear even if disconnect fails
      this._wallet = null;
      this.clearWalletState();
    }
  }

  isConnected(): boolean {
    if (!this.isBrowser) return false;
    
    const provider = this.getProvider();
    if (!provider) return false;

    // Check both our stored wallet and the provider
    return !!(this._wallet?.publicKey || (provider.isConnected && provider.publicKey));
  }

  isPhantomInstalled(): boolean {
    if (!this.isBrowser) return false;
    return !!this.getProvider();
  }

  private getProvider(): any {
    if (!this.isBrowser) return null;

    // Check multiple possible locations for Phantom
    if (window.phantom?.solana?.isPhantom) {
      return window.phantom.solana;
    }

    if (window.solana?.isPhantom) {
      return window.solana;
    }

    return null;
  }

  private async waitForPhantom(timeout: number = 3000): Promise<void> {
    if (!this.isBrowser) return;

    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (this.getProvider()) {
        console.log('✅ Phantom provider detected');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('⚠️ Phantom provider not found after waiting');
  }

  async autoConnect(): Promise<string | null> {
    if (!this.isBrowser) return null;

    const provider = this.getProvider();
    if (!provider) return null;

    try {
      // Check if there's a saved state that's still valid
      const savedState = this.getSavedWalletState();
      
      if (!savedState) {
        return null;
      }

      // Try to connect with onlyIfTrusted
      const response = await provider.connect({ onlyIfTrusted: true });
      
      if (response?.publicKey) {
        const address = response.publicKey.toString();
        
        // Verify it matches saved state
        if (address === savedState.address) {
          this._wallet = provider;
          console.log('✅ Auto-connected to wallet:', address);
          return address;
        } else {
          console.log('⚠️ Wallet address mismatch during auto-connect');
          this.clearWalletState();
          return null;
        }
      }
    } catch (error) {
      console.log('Auto-connect not available');
      // Clear state if auto-connect fails
      this.clearWalletState();
    }

    return null;
  }

  async refreshWalletState(): Promise<void> {
    if (!this.isBrowser) return;

    const provider = this.getProvider();
    if (!provider) {
      this._wallet = null;
      this.clearWalletState();
      return;
    }

    // Check if provider says it's connected
    if (provider.isConnected && provider.publicKey) {
      const address = provider.publicKey.toString();
      const savedState = this.getSavedWalletState();
      
      // Verify against saved state
      if (!savedState || savedState.address !== address) {
        console.log('⚠️ Wallet state mismatch, refreshing...');
        this.saveWalletState(address);
      }
      
      this._wallet = provider;
      console.log('✅ Wallet state refreshed:', address);
    } else {
      this._wallet = null;
      this.clearWalletState();
      console.log('🔌 Wallet not connected');
    }
  }

  // ========================================
  // STORAGE MANAGEMENT
  // ========================================

  private saveWalletState(address: string): void {
    if (!this.isBrowser) return;

    const state: WalletState = {
      address,
      connected: true,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      console.log('💾 Wallet state saved');
    } catch (error) {
      console.error('Failed to save wallet state:', error);
    }
  }

  private getSavedWalletState(): WalletState | null {
    if (!this.isBrowser) return null;

    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return null;

      const state = JSON.parse(saved) as WalletState;
      return state;
    } catch (error) {
      console.error('Failed to read wallet state:', error);
      return null;
    }
  }

  private clearWalletState(): void {
    if (!this.isBrowser) return;

    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Wallet state cleared');
    } catch (error) {
      console.error('Failed to clear wallet state:', error);
    }
  }

  private cleanupStaleState(): void {
    if (!this.isBrowser) return;

    const savedState = this.getSavedWalletState();
    
    if (!savedState) return;

    const isExpired = Date.now() - savedState.timestamp > this.STATE_EXPIRY;
    
    if (isExpired) {
      console.log('🧹 Cleaning up stale wallet state');
      this.clearWalletState();
    }
  }

  // Force clear all wallet-related storage (for debugging)
  clearAllStorage(): void {
    if (!this.isBrowser) return;

    try {
      // Clear our wallet state
      this.clearWalletState();
      
      // Clear any other Phantom-related storage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('phantom') || key.includes('solana') || key.includes('wallet'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('🗑️ Removed:', key);
      });
      
      console.log('✅ All wallet storage cleared');
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
}