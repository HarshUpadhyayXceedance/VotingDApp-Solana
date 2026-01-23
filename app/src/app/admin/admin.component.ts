import { Component, Inject, PLATFORM_ID, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SolanaService } from '../services/solana.service';
import { WalletService } from '../services/wallet.service';
import { FormsModule } from '@angular/forms';

interface Election {
  title: string;
  status: 'active' | 'closed';
  endedAgo: string;
  totalVotes: number;
  winner: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminComponent implements OnInit {
  isBrowser = false;
  electionTitle = '';
  candidateName = '';
  loading = false;
  walletAddress: string | null = null;

  // Modal states
  showCreateModal = false;
  showCandidateModal = false;

  // Dashboard stats (mock data - replace with actual data from Solana)
  totalElections = 24;
  activeElections = 2;
  totalCandidates = 156;
  totalVoters = 3402;

  // Recent elections (mock data - replace with actual data from Solana)
  recentElections: Election[] = [
    {
      title: 'Solana Foundation Council 2024',
      status: 'closed',
      endedAgo: '2 days ago',
      totalVotes: 1240,
      winner: 'Option A'
    },
    {
      title: 'Community Grant Proposal #45',
      status: 'closed',
      endedAgo: '5 days ago',
      totalVotes: 892,
      winner: 'Approve'
    },
    {
      title: 'Devnet Validator Rewards',
      status: 'closed',
      endedAgo: '1 week ago',
      totalVotes: 450,
      winner: 'Tier 2'
    }
  ];

  constructor(
    private solana: SolanaService,
    private wallet: WalletService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.connectWallet();
    }
  }

  async connectWallet() {
    try {
      this.walletAddress = await this.wallet.connect();
    } catch (e) {
      console.error('Wallet connection failed:', e);
    }
  }

  // Modal controls
  openCreateElectionModal() {
    this.showCreateModal = true;
  }

  closeCreateElectionModal() {
    this.showCreateModal = false;
    this.electionTitle = '';
  }

  openCandidateModal() {
    this.showCandidateModal = true;
  }

  closeCandidateModal() {
    this.showCandidateModal = false;
    this.candidateName = '';
  }

  async createElection() {
    if (!this.electionTitle) return;

    this.loading = true;

    const program = await this.solana.getProgram();
    if (!program) {
      this.loading = false;
      alert('Please connect your wallet first');
      return;
    }

    try {
      await program.methods
        .createElection(this.electionTitle)
        .rpc();

      alert('✅ Election created successfully!');
      this.electionTitle = '';
      this.closeCreateElectionModal();
      this.refreshData();
    } catch (e) {
      console.error('Error creating election:', e);
      alert('❌ Failed to create election. Please try again.');
    }

    this.loading = false;
  }

  async addCandidate() {
    if (!this.candidateName) return;

    this.loading = true;

    const program = await this.solana.getProgram();
    if (!program) {
      this.loading = false;
      alert('Please connect your wallet first');
      return;
    }

    try {
      await program.methods
        .addCandidate(this.candidateName)
        .rpc();

      alert('✅ Candidate added successfully!');
      this.candidateName = '';
      this.closeCandidateModal();
      this.refreshData();
    } catch (e) {
      console.error('Error adding candidate:', e);
      alert('❌ Failed to add candidate. Please try again.');
    }

    this.loading = false;
  }

  async closeElection() {
    if (!confirm('Are you sure you want to close this election? This action cannot be undone.')) {
      return;
    }

    this.loading = true;

    const program = await this.solana.getProgram();
    if (!program) {
      this.loading = false;
      alert('Please connect your wallet first');
      return;
    }

    try {
      await program.methods.closeElection().rpc();
      alert('✅ Election closed successfully!');
      this.refreshData();
    } catch (e) {
      console.error('Error closing election:', e);
      alert('❌ Failed to close election. Please try again.');
    }

    this.loading = false;
  }

  async refreshData() {
    this.loading = true;

    // TODO: Fetch actual data from Solana program
    // For now, simulate a refresh with a delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update stats (replace with actual Solana data)
    // const program = await this.solana.getProgram();
    // if (program) {
    //   // Fetch elections, candidates, voters, etc.
    // }

    this.loading = false;
  }
}