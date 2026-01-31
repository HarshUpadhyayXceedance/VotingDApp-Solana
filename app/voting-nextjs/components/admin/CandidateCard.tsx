'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Trash2, User } from 'lucide-react';

interface CandidateCardProps {
  candidate: any;
  canDelete?: boolean;
  onDelete?: (candidateId: string) => void;
}

export function CandidateCard({
  candidate,
  canDelete = false,
  onDelete,
}: CandidateCardProps) {
  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all p-6">
      {/* Image */}
      {candidate.imageUrl ? (
        <div className="w-full h-48 bg-gray-900 rounded-lg mb-4 overflow-hidden">
          <img
            src={candidate.imageUrl}
            alt={candidate.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-full h-full flex items-center justify-center">
                    <svg class="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                `;
              }
            }}
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-900 rounded-lg mb-4 flex items-center justify-center">
          <User className="w-16 h-16 text-gray-600" />
        </div>
      )}

      {/* Content */}
      <div className="space-y-3">
        {/* Name and ID */}
        <div>
          <h3 className="text-xl font-bold text-white mb-1">
            {candidate.name}
          </h3>
          <p className="text-xs text-gray-500">ID: {candidate.candidateId}</p>
        </div>

        {/* Description */}
        {candidate.description && (
          <p className="text-sm text-gray-400 line-clamp-3">
            {candidate.description}
          </p>
        )}

        {/* Vote Count */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-lg font-bold text-green-400">
              {candidate.voteCount}
            </span>
            <span className="text-sm text-gray-400">votes</span>
          </div>

          {/* Delete Button */}
          {canDelete && onDelete && (
            <Button
              onClick={() => onDelete(candidate.publicKey)}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}