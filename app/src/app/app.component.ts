import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService } from './services/wallet.service';
import { AdminComponent } from './admin/admin.component';
import { LandingComponent } from './landing/landing.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  walletAddress: string | null = null;

  constructor(private walletService: WalletService) {}

  async connectWallet() {
    this.walletAddress = await this.walletService.connect();
  }

  disconnectWallet() {
    this.walletService.disconnect();
    this.walletAddress = null;
  }
}
