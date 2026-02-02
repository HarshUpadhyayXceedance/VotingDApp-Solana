'use client';

import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey, SystemProgram, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import {
  ElectionStatus,
  parseElectionStatus,
  VoterRegistrationType,
  parseVoterRegistrationType,
  RegistrationStatus,
} from '@/lib/types';
import {
  getElectionStatusLabel,
  getElectionStatusColor,
  formatElectionTime,
  getTimeRemaining,
} from '@/lib/election-utils';
import { getVoterRegistrationPda, getVoteRecordPda, getAdminRegistryPda } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/shared/AppLayout';
import { VoterSidebar } from '@/components/shared/VoterSidebar';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Trophy,
  Users,
  Vote,
  Loader2,
  X,
  Shield,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface CandidateData {
  publicKey: string;
  candidateId: number;
  name: string;
  description: string;
  imageUrl: string;
  voteCount: number;
}

export default function VoterElectionDetailPage() {
  const params = useParams();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const program = useProgram();
  const electionId = params.id as string;

  // Election data
  const [election, setElection] = useState<any>(null);
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Voter state
  const [hasVoted, setHasVoted] = useState(false);
  const [myVotedCandidateKey, setMyVotedCandidateKey] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null);

  // Voting UX
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState('');

  // Registration UX
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState('');

  // Vote receipt modal
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptTxHash, setReceiptTxHash] = useState('');
  const [receiptTimestamp, setReceiptTimestamp] = useState(0);

  const fetchData = async () => {
    if (!program || !electionId) return;
    try {
      setLoading(true);
      setError('');

      const electionPubkey = new PublicKey(electionId);

      // @ts-ignore
      const electionAccount = await program.account.election.fetch(electionPubkey);

      const electionData = {
        publicKey: electionId,
        electionId: electionAccount.electionId?.toNumber
          ? electionAccount.electionId.toNumber()
          : Number(electionAccount.electionId),
        title: electionAccount.title,
        description: electionAccount.description,
        startTime: electionAccount.startTime?.toNumber
          ? electionAccount.startTime.toNumber()
          : Number(electionAccount.startTime),
        endTime: electionAccount.endTime?.toNumber
          ? electionAccount.endTime.toNumber()
          : Number(electionAccount.endTime),
        totalVotes: Number(electionAccount.totalVotes?.toString?.() ?? electionAccount.totalVotes),
        candidateCount: Number(electionAccount.candidateCount?.toString?.() ?? electionAccount.candidateCount),
        status: parseElectionStatus(electionAccount.status),
        voterRegistrationType: parseVoterRegistrationType(electionAccount.voterRegistrationType),
      };
      setElection(electionData);

      // Fetch candidates
      // @ts-ignore
      const candidateAccounts = await program.account.candidate.all([
        {
          memcmp: {
            offset: 8,
            bytes: electionPubkey.toBase58(),
          },
        },
      ]);

      const candidatesData: CandidateData[] = candidateAccounts.map((acc: any) => ({
        publicKey: acc.publicKey.toString(),
        candidateId: acc.account.candidateId?.toNumber
          ? acc.account.candidateId.toNumber()
          : Number(acc.account.candidateId),
        name: acc.account.name,
        description: acc.account.description,
        imageUrl: acc.account.imageUrl,
        voteCount: Number(acc.account.voteCount?.toString?.() ?? acc.account.voteCount),
      }));
      candidatesData.sort((a, b) => a.candidateId - b.candidateId);
      setCandidates(candidatesData);

      // Voter-specific checks
      if (publicKey) {
        // Check vote record
        try {
          const [voteRecordPda] = getVoteRecordPda(electionPubkey, publicKey, program.programId);
          // @ts-ignore
          const voteRecord = await program.account.voteRecord.fetch(voteRecordPda);
          setHasVoted(true);
          setMyVotedCandidateKey(voteRecord.candidate.toString());
        } catch {
          setHasVoted(false);
          setMyVotedCandidateKey(null);
        }

        // Check registration for whitelist
        if (electionData.voterRegistrationType === VoterRegistrationType.Whitelist) {
          try {
            const [voterRegPda] = getVoterRegistrationPda(electionPubkey, publicKey, program.programId);
            // @ts-ignore
            const reg = await program.account.voterRegistration.fetch(voterRegPda);
            if (reg.status.pending !== undefined) setRegistrationStatus(RegistrationStatus.Pending);
            else if (reg.status.approved !== undefined) setRegistrationStatus(RegistrationStatus.Approved);
            else if (reg.status.rejected !== undefined) setRegistrationStatus(RegistrationStatus.Rejected);
            else if (reg.status.revoked !== undefined) setRegistrationStatus(RegistrationStatus.Revoked);
          } catch {
            setRegistrationStatus(null);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching election detail:', err);
      setError('Failed to load election');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [program, electionId, publicKey]);

  // --- CAST VOTE ---
  const handleCastVote = async () => {
    if (!program || !publicKey || !selectedCandidate || !election) return;
    setIsVoting(true);
    setVoteError('');

    try {
      console.log('🗳️ Starting vote casting process...');

      // Check wallet balance before attempting — new PDA accounts require rent-exemption funding
      const balance = await connection.getBalance(publicKey);
      console.log('💰 Wallet balance:', balance / 1e9, 'SOL');

      if (balance < 1_000_000) {
        // Less than 0.001 SOL — almost certainly unfunded
        setVoteError('Your wallet has insufficient SOL. On localnet, run: solana airdrop 2 --url http://localhost:8899');
        setIsVoting(false);
        return;
      }

      const electionPubkey = new PublicKey(electionId);
      const candidatePubkey = new PublicKey(selectedCandidate);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [voteRecordPda] = getVoteRecordPda(electionPubkey, publicKey, program.programId);

      console.log('📋 Account PDAs:');
      console.log('  Admin Registry:', adminRegistryPda.toString());
      console.log('  Election:', electionPubkey.toString());
      console.log('  Candidate:', candidatePubkey.toString());
      console.log('  Vote Record:', voteRecordPda.toString());
      console.log('  Voter:', publicKey.toString());

      // Determine voter registration account
      // For Whitelist elections: use the actual voter registration PDA
      // For Open elections: use PublicKey.default (account not checked by contract)
      let voterRegistrationAccount: PublicKey;
      if (election.voterRegistrationType === VoterRegistrationType.Whitelist) {
        const [voterRegPda] = getVoterRegistrationPda(electionPubkey, publicKey, program.programId);
        voterRegistrationAccount = voterRegPda;
        console.log('✅ Whitelist election - using voter registration PDA:', voterRegPda.toString());
      } else {
        voterRegistrationAccount = PublicKey.default;
        console.log('✅ Open election - using PublicKey.default for voter registration');
      }

      const accounts: any = {
        adminRegistry: adminRegistryPda,
        election: electionPubkey,
        candidate: candidatePubkey,
        voterRegistration: voterRegistrationAccount,
        voteRecord: voteRecordPda,
        voter: publicKey,
        systemProgram: SystemProgram.programId,
      };

      console.log('🔨 Building cast vote instruction...');
      // Build transaction explicitly so wallet adapter funds the new PDA properly
      // @ts-ignore
      const castVoteInstruction = await program.methods
        .castVote()
        .accounts(accounts)
        .instruction();

      console.log('✅ Instruction built successfully');

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      console.log('📦 Latest blockhash:', blockhash);

      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: publicKey,
      });

      // Add compute budget with VERY high priority fee for devnet
      // 1,000,000 microLamports = 0.001 SOL per tx (still very cheap)
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 }) // 10x higher for devnet
      );
      transaction.add(castVoteInstruction);

      console.log('📤 Sending transaction to wallet for signing...');
      console.log('Transaction details:', {
        instructions: transaction.instructions.length,
        feePayer: transaction.feePayer?.toString(),
        recentBlockhash: transaction.recentBlockhash,
      });

      // Simulate transaction first to get detailed error if any
      console.log('🔍 Simulating transaction before sending...');
      try {
        const simulationResult = await connection.simulateTransaction(transaction);
        console.log('📊 Simulation result:', simulationResult);

        if (simulationResult.value.err) {
          console.error('❌ Simulation failed:', simulationResult.value.err);
          console.error('📋 Simulation logs:', simulationResult.value.logs);
          throw new Error(`Transaction simulation failed: ${JSON.stringify(simulationResult.value.err)}`);
        }

        console.log('✅ Simulation successful!');
      } catch (simErr: any) {
        console.error('❌ Simulation error:', simErr);
        throw simErr;
      }

      const tx = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      console.log('✅ Transaction sent:', tx);
      console.log('⏳ Confirming transaction (this may take a while on devnet)...');

      // Try to confirm, but if it times out, check if vote was actually recorded
      let voteSucceeded = false;
      try {
        const confirmation = await connection.confirmTransaction({
          signature: tx,
          blockhash: blockhash,
          lastValidBlockHeight: lastValidBlockHeight,
        }, 'confirmed');

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        voteSucceeded = true;
        console.log('✅ Vote confirmed:', tx);
      } catch (confirmErr: any) {
        // Confirmation timed out - check if vote was actually recorded
        console.log('⚠️ Confirmation timed out, checking if vote was recorded...');

        try {
          // Check if vote record exists
          // @ts-ignore
          const voteRecord = await program.account.voteRecord.fetch(voteRecordPda);
          if (voteRecord && voteRecord.voter.toString() === publicKey.toString()) {
            voteSucceeded = true;
            console.log('✅ Vote was recorded successfully despite timeout!');
          }
        } catch (fetchErr) {
          // Vote record doesn't exist, transaction actually failed
          throw confirmErr; // Re-throw the original confirmation error
        }
      }

      if (!voteSucceeded) {
        throw new Error('Vote was not recorded');
      }

      // Show receipt
      setReceiptTxHash(tx);
      setReceiptTimestamp(Math.floor(Date.now() / 1000));
      setShowReceipt(true);
      setHasVoted(true);
      setMyVotedCandidateKey(selectedCandidate);
      setSelectedCandidate(null);

      // Refresh data
      await fetchData();
    } catch (err: any) {
      console.error('❌ Vote error:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        code: err.code,
        logs: err.logs,
        stack: err.stack,
      });

      let msg = 'Failed to cast vote';
      if (err.message?.includes('AlreadyVoted')) msg = 'You have already voted in this election';
      else if (err.message?.includes('VoterNotRegistered')) msg = 'You are not registered for this election';
      else if (err.message?.includes('ElectionNotActive')) msg = 'This election is not currently active';
      else if (err.message?.includes('User rejected')) msg = 'Transaction rejected by wallet';
      else if (err.message?.includes('block height exceeded') || err.message?.includes('BlockheightExceeded')) {
        msg = 'Transaction timed out due to slow devnet. Refresh the page to check if your vote was recorded, or try voting again.';
      }
      else if (err.message?.includes('Transaction was not confirmed') || err.message?.includes('TransactionExpired')) {
        msg = 'Transaction confirmation timed out. Refresh the page to check if your vote was recorded, or try voting again.';
      }
      else if (err.message) msg = err.message;
      setVoteError(msg);
    } finally {
      setIsVoting(false);
    }
  };

  // --- SELF-REGISTER ---
  const handleSelfRegister = async () => {
    if (!program || !publicKey || !election) return;
    setIsRegistering(true);
    setRegError('');

    try {
      // Check wallet balance before attempting — new PDA accounts require rent-exemption funding
      const balance = await connection.getBalance(publicKey);
      if (balance < 1_000_000) {
        setRegError('Your wallet has insufficient SOL. On localnet, run: solana airdrop 2 --url http://localhost:8899');
        setIsRegistering(false);
        return;
      }

      const electionPubkey = new PublicKey(electionId);
      const [adminRegistryPda] = getAdminRegistryPda(program.programId);
      const [voterRegPda] = getVoterRegistrationPda(electionPubkey, publicKey, program.programId);

      // Build transaction explicitly so wallet adapter funds the new PDA properly
      // @ts-ignore
      const registerInstruction = await program.methods
        .requestVoterRegistration()
        .accounts({
          adminRegistry: adminRegistryPda,
          election: electionPubkey,
          voterRegistration: voterRegPda,
          voter: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const { blockhash } = await connection.getLatestBlockhash();
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: publicKey,
      });

      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 })
      );
      transaction.add(registerInstruction);

      const tx = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'finalized',
      });
      await connection.confirmTransaction(tx, 'finalized');

      console.log('✅ Registration requested:', tx);
      setRegistrationStatus(RegistrationStatus.Pending);
      await fetchData();
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      let msg = 'Failed to request registration';
      if (err.message?.includes('AlreadyRegistered') || err.message?.includes('already in use'))
        msg = 'You are already registered for this election';
      else if (err.message) msg = err.message;
      setRegError(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  // --- DERIVED STATE ---
  const isActive = election?.status === ElectionStatus.Active;
  const isFinalized = election?.status === ElectionStatus.Finalized;
  const isWhitelist = election?.voterRegistrationType === VoterRegistrationType.Whitelist;
  const canVote =
    isActive &&
    !hasVoted &&
    (!isWhitelist || registrationStatus === RegistrationStatus.Approved);

  // For results: find the winner
  const winner = candidates.length > 0
    ? [...candidates].sort((a, b) => b.voteCount - a.voteCount)[0]
    : null;
  const totalVotes = election?.totalVotes ?? 0;

  // --- RENDER ---
  if (loading) {
    return (
      <AppLayout sidebar={<VoterSidebar />} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Loading election...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !election) {
    return (
      <AppLayout sidebar={<VoterSidebar />} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-gray-400">{error || 'Election not found'}</p>
            <Link href="/elections">
              <Button variant="outline" className="mt-4 border-gray-600">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebar={<VoterSidebar />} showFooter={false}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back */}
        <Link href="/elections">
          <Button variant="ghost" className="mb-5 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Elections
          </Button>
        </Link>

        {/* Election Header */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
            <h1 className="text-2xl font-bold text-white">{election.title}</h1>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getElectionStatusColor(election.status)}`}>
                {getElectionStatusLabel(election.status)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isWhitelist ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400'
              }`}>
                {isWhitelist ? '🔒 Whitelist' : '🌐 Open'}
              </span>
            </div>
          </div>
          {election.description && <p className="text-gray-400 text-sm mb-4">{election.description}</p>}
          <div className="flex items-center gap-6 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatElectionTime(election.startTime)} — {formatElectionTime(election.endTime)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {election.candidateCount} candidates · {election.totalVotes} votes
            </span>
            {isActive && (
              <span className="flex items-center gap-1.5 text-yellow-500">
                <Clock className="w-3.5 h-3.5" />
                Ends in {getTimeRemaining(election.endTime)}
              </span>
            )}
          </div>
        </div>

        {/* Registration banner for whitelist elections */}
        {isWhitelist && isActive && registrationStatus === null && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-blue-400">Registration Required</h3>
                </div>
                <p className="text-gray-400 text-sm">
                  This election requires voter registration. Request access to participate.
                </p>
                {regError && <p className="text-red-400 text-xs mt-2">{regError}</p>}
              </div>
              <Button
                onClick={handleSelfRegister}
                disabled={isRegistering}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Requesting...
                  </>
                ) : (
                  'Request Registration'
                )}
              </Button>
            </div>
          </div>
        )}

        {isWhitelist && isActive && registrationStatus === RegistrationStatus.Pending && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-400 text-sm">Your registration is pending admin approval. You'll be able to vote once approved.</p>
          </div>
        )}

        {isWhitelist && isActive && registrationStatus === RegistrationStatus.Rejected && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">Your registration was rejected. Contact the election admin for details.</p>
          </div>
        )}

        {/* Winner Banner — shown when finalized */}
        {isFinalized && winner && totalVotes > 0 && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-purple-500/10 border border-yellow-500/30 rounded-xl p-5 mb-6 flex items-center gap-5">
            <div className="w-14 h-14 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Trophy className="w-7 h-7 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-0.5">Winner</p>
              <p className="text-xl font-bold text-white">{winner.name}</p>
              <p className="text-sm text-gray-400">
                {winner.voteCount} votes ({totalVotes > 0 ? ((winner.voteCount / totalVotes) * 100).toFixed(1) : 0}% of {totalVotes} total)
              </p>
            </div>
          </div>
        )}

        {/* Already voted notice */}
        {hasVoted && !isFinalized && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-green-400 text-sm">
              You have already voted in this election.{' '}
              <button
                onClick={() => {
                  setReceiptTxHash('');
                  setReceiptTimestamp(0);
                  setShowReceipt(true);
                }}
                className="underline cursor-pointer"
              >
                View receipt
              </button>
            </p>
          </div>
        )}

        {/* Vote error */}
        {voteError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{voteError}</p>
          </div>
        )}

        {/* Candidates */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              {isFinalized ? 'Final Results' : 'Candidates'}
            </h2>
          </div>

          <div className="divide-y divide-gray-700/50">
            {candidates.map((candidate) => {
              const isSelected = selectedCandidate === candidate.publicKey;
              const isMyVote = myVotedCandidateKey === candidate.publicKey;
              const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0;
              const isWinner = isFinalized && winner && candidate.publicKey === winner.publicKey && totalVotes > 0;

              return (
                <div
                  key={candidate.publicKey}
                  className={`p-5 transition-colors ${
                    isSelected ? 'bg-purple-500/10' : 'hover:bg-gray-800/40'
                  } ${canVote ? 'cursor-pointer' : ''}`}
                  onClick={() => canVote && setSelectedCandidate(candidate.publicKey)}
                >
                  <div className="flex items-start gap-4">
                    {/* Selection radio / status indicator */}
                    <div className="flex-shrink-0 mt-0.5">
                      {canVote ? (
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-600'
                        }`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      ) : isMyVote ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : isWinner ? (
                        <Trophy className="w-5 h-5 text-yellow-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-700" />
                      )}
                    </div>

                    {/* Candidate info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{candidate.name}</h3>
                        {isMyVote && (
                          <span className="px-2 py-0.5 bg-green-500/15 text-green-400 text-xs rounded-full">Your Vote</span>
                        )}
                        {isWinner && (
                          <span className="px-2 py-0.5 bg-yellow-500/15 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Winner
                          </span>
                        )}
                      </div>
                      {candidate.description && (
                        <p className="text-gray-400 text-sm mb-2">{candidate.description}</p>
                      )}

                      {/* Vote progress bar — always shown for context */}
                      {(isFinalized || hasVoted || election.status === ElectionStatus.Ended) && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>{candidate.voteCount} votes</span>
                            <span>{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isWinner ? 'bg-yellow-500' : isMyVote ? 'bg-green-500' : 'bg-purple-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vote button */}
          {canVote && (
            <div className="p-5 border-t border-gray-700">
              <Button
                onClick={handleCastVote}
                disabled={!selectedCandidate || isVoting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40"
              >
                {isVoting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Casting Vote...
                  </>
                ) : (
                  <>
                    <Vote className="w-4 h-4 mr-2" />
                    {selectedCandidate ? 'Confirm Vote' : 'Select a Candidate'}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          VOTE RECEIPT MODAL
          ============================================================ */}
      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowReceipt(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            {/* Close */}
            <button
              onClick={() => setShowReceipt(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Success icon with animation */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-white text-center mb-1">Vote Confirmed</h2>
            <p className="text-gray-400 text-sm text-center mb-6">Your vote has been recorded on-chain</p>

            {/* Receipt details */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Election</span>
                <span className="text-xs text-white font-medium truncate ml-4 text-right">{election?.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Candidate</span>
                <span className="text-xs text-white font-medium">
                  {candidates.find(c => c.publicKey === (myVotedCandidateKey || selectedCandidate))?.name ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Voter</span>
                <span className="text-xs text-white font-mono">
                  {publicKey ? `${publicKey.toString().slice(0, 8)}...${publicKey.toString().slice(-6)}` : '—'}
                </span>
              </div>
              {receiptTimestamp > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Timestamp</span>
                  <span className="text-xs text-white font-medium">
                    {new Date(receiptTimestamp * 1000).toLocaleString()}
                  </span>
                </div>
              )}
              {receiptTxHash && (
                <div className="pt-2 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Transaction</span>
                    <a
                      href={`https://solscan.io/tx/${receiptTxHash}?cluster=localnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono"
                    >
                      {receiptTxHash.slice(0, 10)}...{receiptTxHash.slice(-6)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}