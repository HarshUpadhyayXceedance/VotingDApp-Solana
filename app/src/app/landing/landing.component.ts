import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { WalletService } from '../services/wallet.service';
import { ThemeService } from '../services/theme.service';
import { Router } from '@angular/router';
import { RoleService } from '../core/role.service';
import { PublicKey } from '@solana/web3.js';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class LandingComponent implements OnInit, AfterViewInit {
  walletAddress: string | null = null;
  private isBrowser = false;
  connecting = false;

  constructor(
    private walletService: WalletService,
    private themeService: ThemeService,
    private router: Router,
    private roleService: RoleService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    if (this.isBrowser) {
      // Try auto-connect (if user previously connected)
      await this.tryAutoConnect();
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.initAnimations();
    }
  }

  async tryAutoConnect() {
    try {
      const address = await this.walletService.autoConnect();
      if (address) {
        this.walletAddress = address;
        console.log('Auto-connected to wallet');
        // Don't auto-route on auto-connect, let user click
      }
    } catch (error) {
      // Silent fail for auto-connect
      console.log('No previous connection found');
    }
  }

  async connectWallet() {
    if (this.connecting) {
      console.log('Connection already in progress...');
      return;
    }

    this.connecting = true;

    try {
      const address = await this.walletService.connect();

      if (!address) {
        console.log('Connection failed or was cancelled');
        this.connecting = false;
        return;
      }

      // Update UI
      this.walletAddress = address;
      console.log('✅ Connected:', address);

      // Determine role and route
      const publicKey = new PublicKey(address);
      const role = await this.roleService.resolveRole(publicKey);

      console.log('User role:', role);

      // Route based on role
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        await this.router.navigateByUrl('/admin');
      } else {
        await this.router.navigateByUrl('/elections');
      }

    } catch (error) {
      console.error('Error during connection:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      this.connecting = false;
    }
  }

  async disconnectWallet() {
    try {
      await this.walletService.disconnect();
      this.walletAddress = null;
      console.log('Disconnected from wallet');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  toggleTheme() {
    this.themeService.toggle();
  }

  private initAnimations() {
    // EXTRA SAFETY (older browsers / SSR fallback)
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('aos-animate');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    document
      .querySelectorAll('[data-aos]')
      .forEach((el) => observer.observe(el));
  }
}