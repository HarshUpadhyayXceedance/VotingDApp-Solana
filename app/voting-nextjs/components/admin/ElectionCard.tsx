'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Users,
  TrendingUp,
  Clock,
  Play,
  StopCircle,
  CheckCircle,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { ElectionStatus } from '@/lib/types';
import {
  getElectionStatusLabel,
  getElectionStatusColor,
  formatElectionTime,
  canStartElection,
  canEndElection,
  canFinalizeElection,
} from '@/lib/election-utils';

interface ElectionCardProps {
  election: any;
  onStartElection?: (electionId: string) => void;
  onEndElection?: (electionId: string) => void;
  onFinalizeElection?: (electionId: string) => void;
}

export function ElectionCard({
  election,
  onStartElection,
  onEndElection,
  onFinalizeElection,
}: ElectionCardProps) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: () => void) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white">{election.title}</h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${getElectionStatusColor(
                election.status
              )}`}
            >
              {getElectionStatusLabel(election.status)}
            </span>
          </div>
          {election.description && (
            <p className="text-gray-400 text-sm line-clamp-2 mb-3">
              {election.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-purple-400" />
          <span className="text-gray-400">
            {election.candidateCount} Candidates
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-gray-400">{election.totalVotes} Votes</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-gray-400 text-xs">
            {formatElectionTime(election.startTime)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-yellow-400" />
          <span className="text-gray-400 text-xs">
            {formatElectionTime(election.endTime)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-4 border-t border-gray-700">
        {/* View Details Button */}
        <Link href={`/admin/elections/${election.publicKey}`} className="w-full">
          <Button
            variant="outline"
            className="w-full border-gray-600 hover:border-purple-500"
            size="sm"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </Link>

        {/* Lifecycle Action Buttons */}
        <div className="flex gap-2">
          {canStartElection(election) && onStartElection && (
            <Button
              onClick={() => handleAction(() => onStartElection(election.publicKey))}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
          )}

          {canEndElection(election) && onEndElection && (
            <Button
              onClick={() => handleAction(() => onEndElection(election.publicKey))}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              End
            </Button>
          )}

          {canFinalizeElection(election) && onFinalizeElection && (
            <Button
              onClick={() => handleAction(() => onFinalizeElection(election.publicKey))}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Finalize
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}