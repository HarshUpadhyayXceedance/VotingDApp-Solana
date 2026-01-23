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

  constructor(
    private walletService: WalletService,
    private themeService: ThemeService,
    private router: Router,
    private roleService: RoleService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

ngOnInit() {
  if (this.isBrowser && this.walletService.isConnected()) {
    this.walletAddress =
      this.walletService.phantom.publicKey.toString();
  }
}


  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.initAnimations();
    }
  }

async connectWallet() {
  const address = await this.walletService.connect();

  if (!address) {
    return;
  }

  // 🔥 THIS LINE WAS MISSING
  this.walletAddress = address;

  const publicKey = new PublicKey(address);
  const role = await this.roleService.resolveRole(publicKey);

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    this.router.navigateByUrl('/admin');
  } else {
    this.router.navigateByUrl('/elections');
  }
}


  async disconnectWallet() {
    await this.walletService.disconnect();
    this.walletAddress = null;
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
