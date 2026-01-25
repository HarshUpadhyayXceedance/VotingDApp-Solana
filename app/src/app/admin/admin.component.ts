import { Component, Inject, PLATFORM_ID, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SolanaService } from '../services/solana.service';
import { WalletService } from '../services/wallet.service';
import { FormsModule } from '@angular/forms';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';

interface Election {
  publicKey: string;
  title: string;
  status: 'active' | 'closed';
  endedAgo?: string;
  totalVotes: number;
  winner?: string;
  authority: string;
  isActive: boolean;
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

  // Selected election for adding candidates
  selectedElectionPubkey: string | null = null;

  // Dashboard stats
  totalElections = 0;
  activeElections = 0;
  totalCandidates = 0;
  totalVoters = 0;

  // Elections list
  allElections: Election[] = [];
  recentElections: Election[] = [];
  activeElectionsList: Election[] = [];

  constructor(
    private solana: SolanaService,
    private wallet: WalletService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    if (this.isBrowser) {
      // Give services time to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.initializeComponent();
    }
  }

  private async initializeComponent() {
    try {
      // Step 1: Ensure wallet is connected
      const walletConnected = await this.ensureWalletConnected();
      if (!walletConnected) {
        console.log('⚠️ Wallet not connected, waiting for manual connection');
        return;
      }

      // Step 2: Wait a bit for wallet to fully settle
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Try to load data
      await this.refreshData();
    } catch (error) {
      console.error('Error initializing component:', error);
    }
  }

  private async ensureWalletConnected(): Promise<boolean> {
    // Check if wallet is already connected
    if (this.wallet.isConnected()) {
      this.walletAddress = this.wallet.publicKey?.toString() || null;
      console.log('✅ Wallet already connected:', this.walletAddress);
      return true;
    }

    // Try auto-connect
    try {
      const address = await this.wallet.autoConnect();
      if (address) {
        this.walletAddress = address;
        console.log('✅ Auto-connected wallet:', address);
        return true;
      }
    } catch (e) {
      console.log('Auto-connect failed, manual connection required');
    }

    return false;
  }

  async connectWallet() {
    try {
      const address = await this.wallet.connect();
      if (address) {
        this.walletAddress = address;
        console.log('✅ Wallet connected:', address);
        
        // Wait for wallet to settle
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh data
        await this.refreshData();
      }
    } catch (e) {
      console.error('Wallet connection failed:', e);
      this.showNotification('Failed to connect wallet', 'error');
    }
  }

  openCreateElectionModal() {
    if (!this.wallet.isConnected()) {
      this.showNotification('Please connect your wallet first', 'error');
      return;
    }
    this.showCreateModal = true;
  }

  closeCreateElectionModal() {
    this.showCreateModal = false;
    this.electionTitle = '';
  }

  openCandidateModal(electionPubkey?: string) {
    if (!this.wallet.isConnected()) {
      this.showNotification('Please connect your wallet first', 'error');
      return;
    }
    
    if (electionPubkey) {
      this.selectedElectionPubkey = electionPubkey;
    }
    this.showCandidateModal = true;
  }

  closeCandidateModal() {
    this.showCandidateModal = false;
    this.candidateName = '';
    this.selectedElectionPubkey = null;
  }

  async createElection() {
    if (!this.electionTitle || this.electionTitle.trim().length === 0) {
      this.showNotification('Please enter an election title', 'error');
      return;
    }

    if (this.electionTitle.length > 64) {
      this.showNotification('Title must be 64 characters or less', 'error');
      return;
    }

    if (!this.wallet.isConnected()) {
      this.showNotification('Please connect your wallet first', 'error');
      this.closeCreateElectionModal();
      return;
    }

    this.loading = true;

    try {
      // Get program with retry logic
      let program = await this.solana.getProgram();
      
      if (!program) {
        console.log('Program not available, refreshing wallet state...');
        await this.wallet.refreshWalletState();
        await new Promise(resolve => setTimeout(resolve, 500));
        program = await this.solana.getProgram();
      }
      
      if (!program) {
        this.showNotification(
          'Failed to initialize blockchain connection. Please refresh the page and try again.',
          'error'
        );
        this.loading = false;
        return;
      }

      if (!program.provider.publicKey) {
        this.showNotification('Wallet not found in program provider. Please reconnect.', 'error');
        this.loading = false;
        return;
      }

      const electionKeypair = Keypair.generate();

      const [adminPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('admin'), program.provider.publicKey.toBuffer()],
        program.programId
      );

      console.log('Creating election...');
      console.log('Authority:', program.provider.publicKey.toString());
      console.log('Election Pubkey:', electionKeypair.publicKey.toString());
      console.log('Admin PDA:', adminPda.toString());

      const tx = await program.methods
        .createElection(this.electionTitle.trim())
        .accountsStrict({
          authority: program.provider.publicKey,
          adminAccount: adminPda,
          election: electionKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([electionKeypair])
        .rpc();

      console.log('✅ Transaction signature:', tx);
      console.log('✅ View on explorer: https://explorer.solana.com/tx/' + tx + '?cluster=devnet');

      this.showNotification(
        `✅ Election "${this.electionTitle}" created successfully!`,
        'success'
      );
      
      this.electionTitle = '';
      this.closeCreateElectionModal();
      
      setTimeout(() => this.refreshData(), 2000);

    } catch (e: any) {
      console.error('Error creating election:', e);
      
      let errorMsg = 'Failed to create election';
      
      if (e.message?.includes('TitleTooLong')) {
        errorMsg = 'Title is too long (max 64 characters)';
      } else if (e.message?.includes('Unauthorized') || e.message?.includes('0x7d6')) {
        errorMsg = 'You are not authorized. Please ensure:\n\n' +
                  '1. You are using the SUPER_ADMIN wallet, OR\n' +
                  '2. Your wallet has been added as an admin\n\n' +
                  'Current wallet: ' + (this.walletAddress || 'not connected');
      } else if (e.message?.includes('User rejected')) {
        errorMsg = 'Transaction was rejected';
      } else if (e.message?.includes('0x1')) {
        errorMsg = 'Insufficient funds. Please ensure you have enough SOL.';
      } else if (e.logs) {
        console.error('Transaction logs:', e.logs);
        errorMsg = 'Transaction failed. Check console for details.';
      } else if (e.message) {
        errorMsg = e.message;
      }
      
      this.showNotification(errorMsg, 'error');
    }

    this.loading = false;
  }

  async addCandidate() {
    if (!this.candidateName || this.candidateName.trim().length === 0) {
      this.showNotification('Please enter a candidate name', 'error');
      return;
    }

    if (this.candidateName.length > 32) {
      this.showNotification('Name must be 32 characters or less', 'error');
      return;
    }

    if (!this.selectedElectionPubkey) {
      this.showNotification('Please select an election first', 'error');
      return;
    }

    if (!this.wallet.isConnected()) {
      this.showNotification('Please connect your wallet first', 'error');
      this.closeCandidateModal();
      return;
    }

    this.loading = true;

    try {
      const program = await this.solana.getProgram();
      
      if (!program) {
        this.showNotification('Failed to initialize program. Please reconnect your wallet.', 'error');
        this.loading = false;
        return;
      }

      const candidateKeypair = Keypair.generate();
      const electionPubkey = new PublicKey(this.selectedElectionPubkey);

      console.log('Adding candidate...');
      console.log('Election:', electionPubkey.toString());
      console.log('Candidate Pubkey:', candidateKeypair.publicKey.toString());

      const tx = await program.methods
        .addCandidate(this.candidateName.trim())
        .accountsStrict({
          election: electionPubkey,
          candidate: candidateKeypair.publicKey,
          authority: program.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([candidateKeypair])
        .rpc();

      console.log('✅ Transaction signature:', tx);

      this.showNotification(
        `✅ Candidate "${this.candidateName}" added successfully!`,
        'success'
      );
      
      this.candidateName = '';
      this.closeCandidateModal();
      
      setTimeout(() => this.refreshData(), 2000);

    } catch (e: any) {
      console.error('Error adding candidate:', e);
      
      let errorMsg = 'Failed to add candidate';
      if (e.message?.includes('NameTooLong')) {
        errorMsg = 'Name is too long (max 32 characters)';
      } else if (e.message?.includes('ElectionClosed')) {
        errorMsg = 'Cannot add candidate to a closed election';
      } else if (e.message?.includes('Unauthorized')) {
        errorMsg = 'You are not authorized to add candidates to this election';
      } else if (e.message) {
        errorMsg = e.message;
      }
      
      this.showNotification(errorMsg, 'error');
    }

    this.loading = false;
  }

  async closeElection(electionPubkey: string) {
    if (!confirm('Are you sure you want to close this election? This action cannot be undone.')) {
      return;
    }

    if (!this.wallet.isConnected()) {
      this.showNotification('Please connect your wallet first', 'error');
      return;
    }

    this.loading = true;

    try {
      const program = await this.solana.getProgram();
      
      if (!program) {
        this.showNotification('Failed to initialize program. Please reconnect your wallet.', 'error');
        this.loading = false;
        return;
      }

      const electionPublicKey = new PublicKey(electionPubkey);

      console.log('Closing election:', electionPublicKey.toString());

      const tx = await program.methods
        .closeElection()
        .accountsStrict({
          election: electionPublicKey,
          authority: program.provider.publicKey,
        })
        .rpc();

      console.log('✅ Transaction signature:', tx);

      this.showNotification('✅ Election closed successfully!', 'success');
      
      setTimeout(() => this.refreshData(), 2000);

    } catch (e: any) {
      console.error('Error closing election:', e);
      
      let errorMsg = 'Failed to close election';
      if (e.message?.includes('ElectionClosed')) {
        errorMsg = 'Election is already closed';
      } else if (e.message?.includes('Unauthorized')) {
        errorMsg = 'You are not authorized to close this election';
      } else if (e.message) {
        errorMsg = e.message;
      }
      
      this.showNotification(errorMsg, 'error');
    }

    this.loading = false;
  }

  async refreshData() {
    this.loading = true;

    try {
      const program = await this.solana.getProgram();
      if (!program) {
        console.log('Program not available, skipping data fetch');
        this.loading = false;
        return;
      }

      console.log('Fetching all elections and candidates...');

      const electionAccounts = await program.account.election.all();
      const candidateAccounts = await program.account.candidate.all();

      console.log(`Found ${electionAccounts.length} elections`);
      console.log(`Found ${candidateAccounts.length} candidates`);

      this.allElections = electionAccounts.map((acc: any) => ({
        publicKey: acc.publicKey.toString(),
        title: acc.account.title,
        status: acc.account.isActive ? 'active' : 'closed',
        totalVotes: acc.account.totalVotes.toNumber(),
        authority: acc.account.authority.toString(),
        isActive: acc.account.isActive,
        endedAgo: acc.account.isActive ? undefined : this.calculateTimeAgo(acc.account)
      }));

      this.totalElections = this.allElections.length;
      this.activeElections = this.allElections.filter(e => e.isActive).length;
      this.totalCandidates = candidateAccounts.length;

      this.recentElections = this.allElections
        .filter(e => e.status === 'closed')
        .slice(0, 5);

      this.activeElectionsList = this.allElections.filter(e => e.isActive);

      try {
        const voteRecords = await program.account.voteRecord.all();
        this.totalVoters = voteRecords.length;
      } catch (e) {
        console.log('Could not fetch vote records:', e);
        this.totalVoters = 0;
      }

      for (const election of this.recentElections) {
        const electionCandidates = candidateAccounts.filter(
          (c: any) => c.account.election.toString() === election.publicKey
        );

        if (electionCandidates.length > 0) {
          const winner = electionCandidates.reduce((prev: any, current: any) =>
            current.account.votes.toNumber() > prev.account.votes.toNumber() ? current : prev
          );
          election.winner = winner.account.name;
        } else {
          election.winner = 'No candidates';
        }
      }

      console.log('✅ Data refresh complete');

    } catch (e) {
      console.error('Error refreshing data:', e);
      // Don't show error notification on initial load
    }

    this.loading = false;
  }

  calculateTimeAgo(election: any): string {
    return 'recently';
  }

  showNotification(message: string, type: 'success' | 'error' | 'info') {
    if (type === 'success') {
      alert(`✅ ${message}`);
    } else if (type === 'error') {
      alert(`❌ ${message}`);
    } else {
      alert(`ℹ️ ${message}`);
    }
  }

  getActiveElections(): Election[] {
    return this.activeElectionsList;
  }
}