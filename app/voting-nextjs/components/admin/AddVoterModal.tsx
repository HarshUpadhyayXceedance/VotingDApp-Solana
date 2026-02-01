'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  getAdminRegistryPda,
  getAdminPda,
  getVoterRegistrationPda,
} from '@/lib/helpers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, UserPlus, Send, Copy, Wallet } from 'lucide-react';

interface AddVoterModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  electionPublicKey: string;
}

type ModalMode = 'choose' | 'invite' | 'manual' | 'success-invite' | 'success-manual';

export function AddVoterModal({
  open,
  onClose,
  onSuccess,
  electionPublicKey,
}: AddVoterModalProps) {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [mode, setMode] = useState<ModalMode>('choose');
  const [voterAddress, setVoterAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInvite = () => {
    if (!voterAddress) {
      setError('Please enter a voter wallet address');
      return;
    }

    // Validate wallet address
    try {
      new PublicKey(voterAddress);
    } catch (e) {
      setError('Invalid wallet address');
      return;
    }

    setMode('success-invite');
  };

  const handleManualAdd = async () => {
    if (!program || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (!voterAddress) {
      setError('Please enter a voter wallet address');
      return;
    }

    // Validate wallet address
    let voterPubkey: PublicKey;
    try {
      voterPubkey = new PublicKey(voterAddress);
    } catch (e) {
      setError('Invalid wallet address');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const electionPubkey = new PublicKey(electionPublicKey);

      // Get PDAs
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [adminPda] = getAdminPda(publicKey, program.programId);
      const [voterRegPda] = getVoterRegistrationPda(
        electionPubkey,
        voterPubkey,
        program.programId
      );

      console.log('Manually adding voter...');
      console.log('Election:', electionPubkey.toString());
      console.log('Voter:', voterPubkey.toString());
      console.log('Voter Reg PDA:', voterRegPda.toString());

      // Admin creates and immediately approves the voter
      // Step 1: Admin creates registration account (paying for it)
      // Step 2: Admin immediately approves it
      
      // Create voter registration - admin pays, voter gets account
      // @ts-ignore
      const requestTx = await program.methods
        .requestVoterRegistration()
        .accounts({
          adminRegistry: adminRegistryPda,
          election: electionPubkey,
          voterRegistration: voterRegPda,
          voter: voterPubkey,
          systemProgram: SystemProgram.programId,
        })
        .signers([]) // No additional signers needed, admin pays
        .rpc();

      console.log('✅ Registration created:', requestTx);

      // Immediately approve it
      // @ts-ignore
      const approveTx = await program.methods
        .approveVoterRegistration()
        .accounts({
          adminRegistry: adminRegistryPda,
          adminAccount: adminPda,
          election: electionPubkey,
          voterRegistration: voterRegPda,
          authority: publicKey,
        })
        .rpc();

      console.log('✅ Voter approved:', approveTx);

      setMode('success-manual');

      // Refresh voter list
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error: any) {
      console.error('❌ Error manually adding voter:', error);

      let errorMsg = 'Failed to add voter';

      if (error.message?.includes('already in use') || error.message?.includes('0x0')) {
        errorMsg = 'This voter is already registered for this election';
      } else if (error.message?.includes('InvalidPublicKey')) {
        errorMsg = 'Invalid wallet address';
      } else if (error.message?.includes('InsufficientPermissions')) {
        errorMsg = 'You do not have permission to manage voters';
      } else if (error.message?.includes('AdminNotActive')) {
        errorMsg = 'Your admin account is not active';
      } else if (error.message?.includes('Signature verification failed')) {
        errorMsg = 'Cannot add voter - they must register themselves or be present to sign the transaction';
      } else if (error.message?.includes('insufficient')) {
        errorMsg = 'Insufficient SOL. Please get more SOL from a faucet.';
      } else if (error.message) {
        errorMsg = error.message;
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setVoterAddress('');
      setError('');
      setMode('choose');
      onClose();
    }
  };

  const renderChooseMode = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-white text-2xl">Add Voter</DialogTitle>
        <DialogDescription className="text-gray-400">
          Choose how you want to add a voter to this election
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-6">
        {/* Voter Address Input */}
        <div className="space-y-2">
          <Label htmlFor="voterAddress" className="text-white">
            Voter Wallet Address <span className="text-red-400">*</span>
          </Label>
          <Input
            id="voterAddress"
            value={voterAddress}
            onChange={(e) => setVoterAddress(e.target.value)}
            placeholder="Enter Solana wallet address (e.g., 5A7bDg...)"
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 font-mono"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Option Cards */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          {/* Send Invite Option */}
          <button
            onClick={() => {
              if (!voterAddress) {
                setError('Please enter a voter wallet address first');
                return;
              }
              try {
                new PublicKey(voterAddress);
                setError('');
                setMode('invite');
              } catch (e) {
                setError('Invalid wallet address');
              }
            }}
            disabled={loading}
            className="p-6 rounded-lg border-2 border-gray-700 bg-gray-800 hover:border-blue-500 hover:bg-gray-750 transition-all text-left group"
          >
            <Send className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-white mb-2">Send Invite</h3>
            <p className="text-sm text-gray-400">
              Generate instructions to share with the voter. They register themselves.
            </p>
            <div className="mt-3 text-xs text-gray-500">
              ✓ Voter must take action<br/>
              ✓ No transaction needed now
            </div>
          </button>

          {/* Add Manually Option */}
          <button
            onClick={() => {
              if (!voterAddress) {
                setError('Please enter a voter wallet address first');
                return;
              }
              try {
                new PublicKey(voterAddress);
                setError('');
                setMode('manual');
              } catch (e) {
                setError('Invalid wallet address');
              }
            }}
            disabled={loading}
            className="p-6 rounded-lg border-2 border-gray-700 bg-gray-800 hover:border-green-500 hover:bg-gray-750 transition-all text-left group"
          >
            <UserPlus className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-white mb-2">Add Manually</h3>
            <p className="text-sm text-gray-400">
              Register and approve the voter immediately. Best when voter is present.
            </p>
            <div className="mt-3 text-xs text-gray-500">
              ✓ Instant approval<br/>
              ✓ You pay gas fees
            </div>
          </button>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={handleClose}
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </Button>
      </DialogFooter>
    </>
  );

  const renderInviteMode = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-white text-2xl">
          <Send className="w-6 h-6 inline-block mr-2 text-blue-400" />
          Send Invite
        </DialogTitle>
        <DialogDescription className="text-gray-400">
          Generate registration instructions for the voter
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-6">
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-3">
          <p className="text-sm text-gray-300 font-semibold">How it works:</p>
          <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
            <li>Share the election details with the voter</li>
            <li>Voter connects their wallet and requests registration</li>
            <li>You'll see their request in the Voters page</li>
            <li>Approve their request when ready</li>
          </ol>
        </div>

        <div className="p-3 bg-gray-800 border border-gray-700 rounded">
          <p className="text-xs text-gray-400">
            💡 <strong>Best for:</strong> Remote voters who will register on their own time
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            setError('');
            setMode('choose');
          }}
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          Back
        </Button>
        <Button
          onClick={handleInvite}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          <Send className="w-4 h-4 mr-2" />
          Generate Instructions
        </Button>
      </DialogFooter>
    </>
  );

  const renderManualMode = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-white text-2xl">
          <UserPlus className="w-6 h-6 inline-block mr-2 text-green-400" />
          Add Manually
        </DialogTitle>
        <DialogDescription className="text-gray-400">
          Immediately register and approve this voter
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-6">
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
          <p className="text-sm text-gray-300 font-semibold">What happens:</p>
          <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
            <li>Voter registration account will be created</li>
            <li>Status will be set to "Approved" immediately</li>
            <li>Voter can vote without any action needed</li>
            <li>You pay the transaction fees (~0.002 SOL)</li>
          </ul>
        </div>

        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
          <p className="text-xs text-yellow-200">
            ⚠️ <strong>Note:</strong> The voter wallet must sign the initial registration transaction.
            Make sure the voter is present with access to their wallet, or use the "Send Invite" option instead.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="p-3 bg-gray-800 border border-gray-700 rounded">
          <p className="text-xs text-gray-400">
            💡 <strong>Best for:</strong> In-person voter registration where the voter can sign the transaction
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            setError('');
            setMode('choose');
          }}
          disabled={loading}
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          Back
        </Button>
        <Button
          onClick={handleManualAdd}
          disabled={loading}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Adding Voter...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Add & Approve Voter
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );

  const renderSuccessInvite = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-white text-2xl">
          <CheckCircle2 className="w-6 h-6 inline-block mr-2 text-blue-400" />
          Invitation Ready!
        </DialogTitle>
        <DialogDescription className="text-gray-400">
          Share these instructions with the voter
        </DialogDescription>
      </DialogHeader>

      <div className="py-6 space-y-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
          <div>
            <Label className="text-gray-400 text-sm mb-2 block">Voter Wallet Address</Label>
            <div className="flex items-center gap-2">
              <Input
                value={voterAddress}
                readOnly
                className="bg-gray-900 border-gray-700 text-white font-mono text-sm"
              />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(voterAddress);
                }}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-gray-400 text-sm mb-2 block">Election ID</Label>
            <div className="flex items-center gap-2">
              <Input
                value={electionPublicKey}
                readOnly
                className="bg-gray-900 border-gray-700 text-white font-mono text-sm"
              />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(electionPublicKey);
                }}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-gray-400 text-sm mb-2 block">Registration Steps</Label>
            <div className="bg-gray-900 border border-gray-700 rounded p-4 text-sm text-gray-300">
              <ol className="list-decimal list-inside space-y-2.5">
                <li>Connect your Solana wallet with address:<br/>
                  <code className="text-xs bg-gray-800 px-2 py-1 rounded mt-1 inline-block break-all">
                    {voterAddress}
                  </code>
                </li>
                <li>Navigate to the Elections page on SolVote</li>
                <li>Find the election with ID:<br/>
                  <code className="text-xs bg-gray-800 px-2 py-1 rounded mt-1 inline-block break-all">
                    {electionPublicKey}
                  </code>
                </li>
                <li>Click the "Request Registration" button</li>
                <li>Wait for admin approval notification</li>
                <li>Once approved, you can cast your vote!</li>
              </ol>
            </div>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
            <p className="text-xs text-blue-200">
              💡 The voter will receive a notification once you approve their registration request.
            </p>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          onClick={() => {
            setVoterAddress('');
            setMode('choose');
          }}
          variant="outline"
          className="flex-1"
        >
          Invite Another
        </Button>
        <Button
          onClick={handleClose}
          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600"
        >
          Done
        </Button>
      </DialogFooter>
    </>
  );

  const renderSuccessManual = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-white text-2xl">
          <CheckCircle2 className="w-6 h-6 inline-block mr-2 text-green-400" />
          Voter Added Successfully!
        </DialogTitle>
        <DialogDescription className="text-gray-400">
          The voter is now approved and can vote
        </DialogDescription>
      </DialogHeader>

      <div className="py-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Registration Complete!</h3>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-400 mb-2">Approved Voter:</p>
            <p className="font-mono text-sm text-white break-all">{voterAddress}</p>
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-sm text-gray-300 text-center">
            ✅ This voter can now participate in the election immediately without any additional steps.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          onClick={() => {
            setVoterAddress('');
            setMode('choose');
          }}
          variant="outline"
          className="flex-1"
        >
          Add Another
        </Button>
        <Button
          onClick={handleClose}
          className="flex-1 bg-gradient-to-r from-green-500 to-green-600"
        >
          Done
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] bg-gray-900 border-gray-800 max-h-[90vh] overflow-y-auto">
        {mode === 'choose' && renderChooseMode()}
        {mode === 'invite' && renderInviteMode()}
        {mode === 'manual' && renderManualMode()}
        {mode === 'success-invite' && renderSuccessInvite()}
        {mode === 'success-manual' && renderSuccessManual()}
      </DialogContent>
    </Dialog>
  );
}