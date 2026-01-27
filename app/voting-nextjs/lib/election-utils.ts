import { ElectionStatus, Election } from './types';

/**
 * Get human-readable label for election status
 */
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
 * Get color class for election status badge
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
 * Get icon name for election status
 */
export function getElectionStatusIcon(status: ElectionStatus): string {
  switch (status) {
    case ElectionStatus.Draft:
      return 'FileText';
    case ElectionStatus.Active:
      return 'Activity';
    case ElectionStatus.Ended:
      return 'StopCircle';
    case ElectionStatus.Cancelled:
      return 'XCircle';
    case ElectionStatus.Finalized:
      return 'CheckCircle';
    default:
      return 'Circle';
  }
}

/**
 * Check if an election is currently active and within voting window
 */
export function canVote(election: Election, currentTime?: number): boolean {
  const now = currentTime || Math.floor(Date.now() / 1000);
  return (
    election.status === ElectionStatus.Active &&
    now >= election.startTime &&
    now <= election.endTime
  );
}

/**
 * Check if election is active (status check only)
 */
export function isElectionActive(election: Election): boolean {
  return election.status === ElectionStatus.Active;
}

/**
 * Check if election can be modified (candidates added/removed)
 */
export function canModifyElection(election: Election): boolean {
  return election.status === ElectionStatus.Draft;
}

/**
 * Check if election can be started
 */
export function canStartElection(election: Election): boolean {
  return election.status === ElectionStatus.Draft && election.candidateCount > 0;
}

/**
 * Check if election can be ended
 */
export function canEndElection(election: Election): boolean {
  return election.status === ElectionStatus.Active;
}

/**
 * Check if election can be cancelled
 */
export function canCancelElection(election: Election): boolean {
  return election.status !== ElectionStatus.Finalized;
}

/**
 * Check if election can be finalized
 */
export function canFinalizeElection(election: Election): boolean {
  return election.status === ElectionStatus.Ended;
}

/**
 * Format Unix timestamp to human-readable date/time
 */
export function formatElectionTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format Unix timestamp to relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);

  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  let value: number;
  let unit: string;

  if (absDiff < minute) {
    return diff < 0 ? 'just now' : 'in a moment';
  } else if (absDiff < hour) {
    value = Math.floor(absDiff / minute);
    unit = 'minute';
  } else if (absDiff < day) {
    value = Math.floor(absDiff / hour);
    unit = 'hour';
  } else if (absDiff < week) {
    value = Math.floor(absDiff / day);
    unit = 'day';
  } else if (absDiff < month) {
    value = Math.floor(absDiff / week);
    unit = 'week';
  } else if (absDiff < year) {
    value = Math.floor(absDiff / month);
    unit = 'month';
  } else {
    value = Math.floor(absDiff / year);
    unit = 'year';
  }

  const plural = value !== 1 ? 's' : '';
  return diff < 0
    ? `${value} ${unit}${plural} ago`
    : `in ${value} ${unit}${plural}`;
}

/**
 * Get time remaining for election
 */
export function getTimeRemaining(endTime: number): string {
  const now = Math.floor(Date.now() / 1000);
  if (now >= endTime) {
    return 'Ended';
  }
  return formatRelativeTime(endTime);
}

/**
 * Get time until election starts
 */
export function getTimeUntilStart(startTime: number): string {
  const now = Math.floor(Date.now() / 1000);
  if (now >= startTime) {
    return 'Started';
  }
  return formatRelativeTime(startTime);
}

/**
 * Check if election is upcoming (not started yet)
 */
export function isUpcoming(election: Election): boolean {
  const now = Math.floor(Date.now() / 1000);
  return election.status === ElectionStatus.Active && now < election.startTime;
}

/**
 * Check if election is ongoing (started and not ended)
 */
export function isOngoing(election: Election): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (
    election.status === ElectionStatus.Active &&
    now >= election.startTime &&
    now <= election.endTime
  );
}

/**
 * Check if election has passed (ended time has passed)
 */
export function hasPassed(election: Election): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now > election.endTime;
}

/**
 * Calculate voting progress percentage
 */
export function getVotingProgress(
  startTime: number,
  endTime: number,
  currentTime?: number
): number {
  const now = currentTime || Math.floor(Date.now() / 1000);
  
  if (now < startTime) return 0;
  if (now > endTime) return 100;
  
  const total = endTime - startTime;
  const elapsed = now - startTime;
  
  return Math.floor((elapsed / total) * 100);
}

/**
 * Validate election time range
 */
export function validateElectionTimes(
  startTime: number,
  endTime: number
): { valid: boolean; error?: string } {
  const now = Math.floor(Date.now() / 1000);
  
  if (startTime <= now) {
    return { valid: false, error: 'Start time must be in the future' };
  }
  
  if (endTime <= startTime) {
    return { valid: false, error: 'End time must be after start time' };
  }
  
  const minDuration = 60 * 60; // 1 hour
  if (endTime - startTime < minDuration) {
    return { valid: false, error: 'Election must be at least 1 hour long' };
  }
  
  return { valid: true };
}