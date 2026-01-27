import { PublicKey } from '@solana/web3.js';

// ============================================================================
// ENUMS (matching backend)
// ============================================================================

export enum ElectionStatus {
  Draft = 'Draft',
  Active = 'Active',
  Ended = 'Ended',
  Cancelled = 'Cancelled',
  Finalized = 'Finalized'
}

export enum VoterRegistrationType {
  Open = 'Open',
  Whitelist = 'Whitelist'
}

export enum RegistrationStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Revoked = 'Revoked'
}

// ============================================================================
// ADMIN TYPES
// ============================================================================

export interface AdminPermissions {
  canManageElections: boolean;
  canManageCandidates: boolean;
  canManageVoters: boolean;
  canFinalizeResults: boolean;
}

export interface Admin {
  authority: PublicKey;
  name: string;
  permissions: AdminPermissions;
  addedBy: PublicKey;
  addedAt: number;
  isActive: boolean;
  bump: number;
}

export interface AdminRegistry {
  superAdmin: PublicKey;
  adminCount: number;
  paused: boolean;
  bump: number;
}

// ============================================================================
// ELECTION TYPES
// ============================================================================

export interface Election {
  electionId: number;
  authority: PublicKey;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  status: ElectionStatus;
  totalVotes: number;
  candidateCount: number;
  voterRegistrationType: VoterRegistrationType;
  bump: number;
}

export interface Candidate {
  election: PublicKey;
  candidateId: number;
  name: string;
  description: string;
  imageUrl: string;
  voteCount: number;
  addedBy: PublicKey;
  addedAt: number;
  bump: number;
}

// ============================================================================
// VOTER TYPES
// ============================================================================

export interface VoterRegistration {
  election: PublicKey;
  voter: PublicKey;
  status: RegistrationStatus;
  requestedAt: number;
  approvedAt: number | null;
  approvedBy: PublicKey | null;
  bump: number;
}

export interface VoteRecord {
  election: PublicKey;
  voter: PublicKey;
  candidate: PublicKey;
  votedAt: number;
  bump: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert backend AdminPermissions to frontend format
 */
export function parseAdminPermissions(backendPerms: any): AdminPermissions {
  return {
    canManageElections: backendPerms.can_manage_elections || false,
    canManageCandidates: backendPerms.can_manage_candidates || false,
    canManageVoters: backendPerms.can_manage_voters || false,
    canFinalizeResults: backendPerms.can_finalize_results || false,
  };
}

/**
 * Convert frontend AdminPermissions to backend format
 */
export function formatAdminPermissions(frontendPerms: AdminPermissions) {
  return {
    can_manage_elections: frontendPerms.canManageElections,
    can_manage_candidates: frontendPerms.canManageCandidates,
    can_manage_voters: frontendPerms.canManageVoters,
    can_finalize_results: frontendPerms.canFinalizeResults,
  };
}

/**
 * Parse ElectionStatus from backend
 */
export function parseElectionStatus(status: any): ElectionStatus {
  if (typeof status === 'object') {
    const key = Object.keys(status)[0];
    return key as ElectionStatus;
  }
  return status as ElectionStatus;
}

/**
 * Parse VoterRegistrationType from backend
 */
export function parseVoterRegistrationType(type: any): VoterRegistrationType {
  if (typeof type === 'object') {
    const key = Object.keys(type)[0];
    return key as VoterRegistrationType;
  }
  return type as VoterRegistrationType;
}

/**
 * Parse RegistrationStatus from backend
 */
export function parseRegistrationStatus(status: any): RegistrationStatus {
  if (typeof status === 'object') {
    const key = Object.keys(status)[0];
    return key as RegistrationStatus;
  }
  return status as RegistrationStatus;
}

/**
 * Format ElectionStatus for backend
 */
export function formatElectionStatus(status: ElectionStatus) {
  return { [status]: {} };
}

/**
 * Format VoterRegistrationType for backend
 */
export function formatVoterRegistrationType(type: VoterRegistrationType) {
  return { [type]: {} };
}

/**
 * Format RegistrationStatus for backend
 */
export function formatRegistrationStatus(status: RegistrationStatus) {
  return { [status]: {} };
}