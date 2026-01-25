'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useProgram } from '@/hooks/useProgram';
import { Keypair, SystemProgram, PublicKey } from '@solana/web3.js';
import { ADMIN_SEED } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Vote, Users, Activity, Database, Plus, RefreshCw } from 'lucide-react';

interface Election {
  publicKey: string;
  title: string;
  isActive: boolean;
  totalVotes: number;
  authority: string;
}

export default function AdminDashboard() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [loading, setLoading] = useState(false);
  const [elections, setElections] = useState<Election[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [electionTitle, setElectionTitle] = useState('');

  // Stats
  const totalElections = elections.length;
  const activeElections = elections.filter(e => e.isActive).length;
  const totalVotes = elections.reduce((sum, e) => sum + e.totalVotes, 0);

  // Fetch elections
  const fetchElections = async () => {
    if (!program) return;

    try {
      setLoading(true);
      const electionAccounts = await program.account.election.all();

      const formattedElections: Election[] = electionAccounts.map((acc: any) => ({
        publicKey: acc.publicKey.toString(),
        title: acc.account.title,
        isActive: acc.account.isActive,
        totalVotes: acc.account.totalVotes.toNumber(),
        authority: acc.account.authority.toString(),
      }));

      setElections(formattedElections);
    } catch (error) {
      console.error('Error fetching elections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create election
  const handleCreateElection = async () => {
    if (!program || !publicKey) return;
    if (!electionTitle || electionTitle.length > 64) {
      alert('Please enter a valid title (max 64 characters)');
      return;
    }

    try {
      setLoading(true);

      // Generate election keypair
      const electionKeypair = Keypair.generate();

      // Derive admin PDA
      const [adminPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(ADMIN_SEED), publicKey.toBuffer()],
        program.programId
      );

      // Create election transaction
      const tx = await program.methods
        .createElection(electionTitle)
        .accountsStrict({
          authority: publicKey,
          adminAccount: adminPda,
          election: electionKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([electionKeypair])
        .rpc();

      console.log('Election created:', tx);
      alert(`✅ Election "${electionTitle}" created successfully!`);
      
      setElectionTitle('');
      setShowCreateModal(false);
      
      // Refresh after 2 seconds
      setTimeout(() => fetchElections(), 2000);
    } catch (error: any) {
      console.error('Error creating election:', error);
      
      let errorMsg = 'Failed to create election';
      if (error.message?.includes('Unauthorized')) {
        errorMsg = 'You are not authorized. Make sure you are an admin.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (program && publicKey) {
      fetchElections();
    }
  }, [program, publicKey]);

  if (!publicKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
          <p className="text-gray-400 mb-6">Please connect your wallet to access the admin dashboard</p>
          <WalletMultiButton />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-900 border-r border-gray-800">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-green-400 flex items-center justify-center">
              <Vote className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">SolVote Admin</span>
          </div>

          <nav className="space-y-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-500/10 text-purple-400">
              <Activity className="w-5 h-5" />
              <span>Dashboard</span>
            </a>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-800">
          <div className="text-sm text-gray-400">
            <div className="font-medium mb-1">Admin Wallet</div>
            <div className="font-mono text-xs">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => fetchElections()} 
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Election
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-400 text-sm">Total Elections</span>
              <Database className="w-8 h-8 text-purple-500" />
            </div>
            <div className="text-4xl font-bold mb-2">{totalElections}</div>
            <div className="text-sm text-gray-400">On-chain data</div>
          </Card>

          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-400 text-sm">Active Now</span>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-4xl font-bold mb-2">{activeElections}</div>
            <div className="text-sm text-green-400">Live voting</div>
          </Card>

          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-400 text-sm">Total Votes</span>
              <Vote className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-4xl font-bold mb-2">{totalVotes}</div>
            <div className="text-sm text-gray-400">Votes cast</div>
          </Card>

          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-400 text-sm">Voters</span>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
            <div className="text-4xl font-bold mb-2">{totalVotes}</div>
            <div className="text-sm text-gray-400">Registered</div>
          </Card>
        </div>

        {/* Elections List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Elections</h2>
          {elections.length === 0 ? (
            <Card className="p-12 text-center">
              <Vote className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No Elections Yet</h3>
              <p className="text-gray-400 mb-6">Create your first election to get started</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Election
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {elections.map((election) => (
                <Card key={election.publicKey} className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{election.title}</h3>
                      <div className="flex gap-4 text-sm text-gray-400">
                        <span className={`px-2 py-1 rounded ${election.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {election.isActive ? 'Active' : 'Closed'}
                        </span>
                        <span>{election.publicKey.slice(0, 8)}...</span>
                        <span>{election.totalVotes} votes</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Election Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Election</DialogTitle>
            <DialogDescription>
              Create a new election on the Solana blockchain
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Election Title</Label>
              <Input
                id="title"
                value={electionTitle}
                onChange={(e) => setElectionTitle(e.target.value)}
                placeholder="e.g., Foundation Council Election 2024"
                maxLength={64}
              />
              <p className="text-sm text-gray-400 mt-1">
                {electionTitle.length}/64 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateElection} 
              disabled={loading || !electionTitle}
            >
              {loading ? 'Creating...' : 'Create Election'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}