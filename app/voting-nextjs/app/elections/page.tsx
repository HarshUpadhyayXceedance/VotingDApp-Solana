'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import {
    parseElectionStatus,
    parseVoterRegistrationType,
    ElectionStatus,
    VoterRegistrationType
} from '@/lib/types';
import {
    getElectionStatusLabel,
    getElectionStatusColor,
    formatElectionTime,
} from '@/lib/election-utils';
import { AppLayout } from '@/components/shared/AppLayout';
import { ElectionsSidebar } from '@/components/shared/ElectionsSidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Vote,
    Calendar,
    Users,
    TrendingUp,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function ElectionsPage() {
    const { publicKey } = useWallet();
    const program = useProgram();

    const [elections, setElections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchElections = async () => {
        if (!program) return;

        try {
            setLoading(true);
            setError('');

            // Fetch all elections
            // @ts-ignore
            const electionAccounts = await program.account.election.all();

            const electionsData = electionAccounts.map((account: any) => ({
                publicKey: account.publicKey.toString(),
                ...account.account,
                status: parseElectionStatus(account.account.status),
                voterRegistrationType: parseVoterRegistrationType(account.account.voterRegistrationType),
            }));

            // Sort by election ID (newest first)
            electionsData.sort((a: any, b: any) => b.electionId - a.electionId);

            setElections(electionsData);
        } catch (error: any) {
            console.error('Error fetching elections:', error);
            setError('Failed to load elections');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchElections();
    }, [program]);

    const activeElections = elections.filter(e => e.status === ElectionStatus.Active);
    const upcomingElections = elections.filter(e => e.status === ElectionStatus.Draft);
    const completedElections = elections.filter(
        e => e.status === ElectionStatus.Ended ||
            e.status === ElectionStatus.Finalized
    );

    return (
        <AppLayout sidebar={<ElectionsSidebar />} showFooter={false}>
            <div className="container mx-auto px-4 py-8 lg:ml-64">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Elections</h1>
                    <p className="text-gray-400">Browse and participate in active elections</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-gray-800/50 border-gray-700 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm mb-1">Total Elections</p>
                                <p className="text-3xl font-bold">{elections.length}</p>
                            </div>
                            <Vote className="w-12 h-12 text-purple-400 opacity-50" />
                        </div>
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-700 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm mb-1">Active Now</p>
                                <p className="text-3xl font-bold">{activeElections.length}</p>
                            </div>
                            <TrendingUp className="w-12 h-12 text-green-400 opacity-50" />
                        </div>
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-700 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm mb-1">Upcoming</p>
                                <p className="text-3xl font-bold">{upcomingElections.length}</p>
                            </div>
                            <Clock className="w-12 h-12 text-blue-400 opacity-50" />
                        </div>
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-700 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm mb-1">Completed</p>
                                <p className="text-3xl font-bold">{completedElections.length}</p>
                            </div>
                            <CheckCircle2 className="w-12 h-12 text-gray-400 opacity-50" />
                        </div>
                    </Card>
                </div>

                {/* Wallet Connection Notice */}
                {!publicKey && (
                    <div className="mb-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-blue-400 mb-2">Connect Your Wallet</h3>
                                <p className="text-gray-300">
                                    Connect your wallet to participate in elections and view your voting history.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Active Elections */}
                {activeElections.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4">Active Elections</h2>
                        <div className="grid gap-6">
                            {activeElections.map((election) => (
                                <Card key={election.publicKey} className="bg-gray-800/50 border-gray-700 p-6 hover:border-purple-500 transition-all">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-2xl font-bold">{election.title}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getElectionStatusColor(election.status)}`}>
                                                    {getElectionStatusLabel(election.status)}
                                                </span>
                                            </div>
                                            {election.description && (
                                                <p className="text-gray-400 mb-4">{election.description}</p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4" />
                                                    <span>{election.candidateCount} Candidates</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Vote className="w-4 h-4" />
                                                    <span>{election.totalVotes} Votes</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Ends: {formatElectionTime(election.endTime)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {election.voterRegistrationType === VoterRegistrationType.Open ? (
                                                        <>
                                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                            <span className="text-green-400">Open Voting</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-4 h-4 text-yellow-400" />
                                                            <span className="text-yellow-400">Whitelist Only</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Link href={`/elections/${election.publicKey}`}>
                                            <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
                                                View & Vote
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Elections */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-2xl font-bold">All Elections</h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
                            <p className="text-gray-400 mt-4">Loading elections...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                            <p className="text-red-400">{error}</p>
                        </div>
                    ) : elections.length === 0 ? (
                        <div className="p-8 text-center">
                            <Vote className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No elections available</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-700">
                            {elections.map((election) => (
                                <Link
                                    key={election.publicKey}
                                    href={`/elections/${election.publicKey}`}
                                    className="block p-6 hover:bg-gray-700/30 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-bold">{election.title}</h3>
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getElectionStatusColor(
                                                        election.status
                                                    )}`}
                                                >
                                                    {getElectionStatusLabel(election.status)}
                                                </span>
                                            </div>
                                            {election.description && (
                                                <p className="text-gray-400 mb-3 line-clamp-2">{election.description}</p>
                                            )}
                                            <div className="flex items-center gap-6 text-sm text-gray-400">
                                                <span>Candidates: {election.candidateCount}</span>
                                                <span>Votes: {election.totalVotes}</span>
                                                <span>{formatElectionTime(election.startTime)} - {formatElectionTime(election.endTime)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
