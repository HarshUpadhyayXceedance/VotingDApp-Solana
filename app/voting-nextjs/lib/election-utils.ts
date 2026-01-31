import { ElectionStatus } from './types';

export function getElectionStatusLabel(status: ElectionStatus): string {
  switch (status) {
    case ElectionStatus.Draft:
      return 'Draft';
    case ElectionStatus.Active:
      return 'Active';
    case ElectionStatus.Ended:
      return 'Ended';
    case ElectionStatus.Cancelled:
      return 'Cancelled';
    case ElectionStatus.Finalized:
      return 'Finalized';
    default:
      return 'Unknown';
  }
}

/**
 * Get color classes for election status badge
 */
export function getElectionStatusColor(status: ElectionStatus): string {
  switch (status) {
    case ElectionStatus.Draft:
      return 'bg-gray-500/20 text-gray-400';
    case ElectionStatus.Active:
      return 'bg-green-500/20 text-green-400';
    case ElectionStatus.Ended:
      return 'bg-blue-500/20 text-blue-400';
    case ElectionStatus.Cancelled:
      return 'bg-red-500/20 text-red-400';
    case ElectionStatus.Finalized:
      return 'bg-purple-500/20 text-purple-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

/**
 * Format Unix timestamp to readable date/time
 */
export function formatElectionTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Check if election can be modified (add/remove candidates)
 */
export function canModifyElection(election: any): boolean {
  return election.status === ElectionStatus.Draft;
}

/**
 * Check if election can be started
 */
export function canStartElection(election: any): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (
    election.status === ElectionStatus.Draft &&
    election.candidateCount > 0 &&
    now >= election.startTime
  );
}

/**
 * Check if election can be ended
 */
export function canEndElection(election: any): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (
    election.status === ElectionStatus.Active &&
    now >= election.endTime
  );
}

/**
 * Check if election can be finalized
 */
export function canFinalizeElection(election: any): boolean {
  return election.status === ElectionStatus.Ended;
}

/**
 * Check if election can be cancelled
 */
export function canCancelElection(election: any): boolean {
  return (
    election.status === ElectionStatus.Draft ||
    election.status === ElectionStatus.Active
  );
}

/**
 * Get election progress percentage
 */
export function getElectionProgress(election: any): number {
  const now = Math.floor(Date.now() / 1000);
  const start = election.startTime;
  const end = election.endTime;

  if (now < start) return 0;
  if (now > end) return 100;

  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
}

/**
 * Get time remaining for election
 */
export function getTimeRemaining(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Check if voting is currently open
 */
export function isVotingOpen(election: any): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (
    election.status === ElectionStatus.Active &&
    now >= election.startTime &&
    now <= election.endTime
  );
}

/**
 * Get election phase description
 */
export function getElectionPhase(election: any): string {
  const now = Math.floor(Date.now() / 1000);

  if (election.status === ElectionStatus.Draft) {
    return 'Election is being prepared';
  }

  if (election.status === ElectionStatus.Cancelled) {
    return 'Election has been cancelled';
  }

  if (election.status === ElectionStatus.Finalized) {
    return 'Results are finalized';
  }

  if (now < election.startTime) {
    return `Starts in ${getTimeRemaining(election.startTime)}`;
  }

  if (now > election.endTime) {
    if (election.status === ElectionStatus.Ended) {
      return 'Voting ended, awaiting finalization';
    }
    return 'Voting has ended';
  }

  return `Ends in ${getTimeRemaining(election.endTime)}`;
}