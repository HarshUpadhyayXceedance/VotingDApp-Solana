import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PublicKey } from '@solana/web3.js';

declare global {
  interface Window {
    solana?: any;
    phantom?: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private _wallet: any = null;
  private isBrowser = false;
  private connectionAttempts = 0;
  private maxAttempts = 3;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      this.setupWalletListeners();
    }
  }

  private setupWalletListeners() {
    // Wait for window to load
    if (typeof window === 'undefined') return;

    // Set up listeners after a short delay to ensure Phantom is loaded
    setTimeout(() => {
      const provider = this.getProvider();
      if (!provider) return;

      try {
        provider.on('connect', (publicKey: any) => {
          console.log('✅ Wallet connected via event:', publicKey.toString());
          this._wallet = provider;
          this.connectionAttempts = 0; // Reset on successful connection
        });

        provider.on('disconnect', () => {
          console.log('🔌 Wallet disconnected via event');
          this._wallet = null;
        });

        provider.on('accountChanged', (publicKey: any) => {
          if (publicKey) {
            console.log('🔄 Account changed:', publicKey.toString());
            this._wallet = provider;
          } else {
            console.log('🔌 Account disconnected');
            this._wallet = null;
          }
        });
      } catch (error) {
        console.log('Note: Could not set up wallet listeners:', error);
      }
    }, 500);
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

    // Increment attempt counter
    this.connectionAttempts++;

    if (this.connectionAttempts > this.maxAttempts) {
      alert('Too many connection attempts. Please refresh the page and try again.');
      this.connectionAttempts = 0;
      return null;
    }

    // Wait for Phantom to be ready
    await this.waitForPhantom();

    // Check if Phantom is installed
    const provider = this.getProvider();
    if (!provider) {
      alert('Phantom wallet not found!\n\nPlease install Phantom wallet extension from phantom.app');
      window.open('https://phantom.app/', '_blank');
      return null;
    }

    try {
      // Check if already connected (eager connection)
      if (provider.isConnected && provider.publicKey) {
        console.log('✅ Already connected to Phantom');
        this._wallet = provider;
        this.connectionAttempts = 0;
        return provider.publicKey.toString();
      }

      console.log('🔐 Requesting connection to Phantom...');
      
      // Request connection with explicit options
      const response = await provider.connect({ 
        onlyIfTrusted: false 
      });
      
      if (!response?.publicKey) {
        throw new Error('No public key returned from wallet');
      }

      this._wallet = provider;
      this.connectionAttempts = 0; // Reset on success
      const address = response.publicKey.toString();
      
      console.log('✅ Wallet connected successfully:', address);
      return address;

    } catch (error: any) {
      console.error('❌ Wallet connection error:', error);
      
      // Handle specific error cases
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
      
      // Generic error
      alert(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isBrowser || !this._wallet) {
      return;
    }

    try {
      if (this._wallet.disconnect) {
        await this._wallet.disconnect();
      }
      this._wallet = null;
      this.connectionAttempts = 0;
      console.log('✅ Wallet disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      // Force clear even if disconnect fails
      this._wallet = null;
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
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('⚠️ Phantom provider not found after waiting');
  }

  // Attempt to reconnect if previously connected
  async autoConnect(): Promise<string | null> {
    if (!this.isBrowser) return null;

    const provider = this.getProvider();
    if (!provider) return null;

    try {
      // Only auto-connect if user previously approved
      const response = await provider.connect({ onlyIfTrusted: true });
      
      if (response?.publicKey) {
        this._wallet = provider;
        this.connectionAttempts = 0;
        const address = response.publicKey.toString();
        console.log('✅ Auto-connected to wallet:', address);
        return address;
      }
    } catch (error) {
      // Silent fail for auto-connect - user will need to connect manually
      console.log('No auto-connect available (user needs to connect manually)');
    }

    return null;
  }

  // Force refresh wallet state
  async refreshWalletState(): Promise<void> {
    if (!this.isBrowser) return;

    const provider = this.getProvider();
    if (!provider) {
      this._wallet = null;
      return;
    }

    // Check if provider says it's connected
    if (provider.isConnected && provider.publicKey) {
      this._wallet = provider;
      console.log('✅ Wallet state refreshed:', provider.publicKey.toString());
    } else {
      this._wallet = null;
      console.log('🔌 Wallet not connected');
    }
  }
}