import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  ADMIN_REGISTRY_SEED,
  ADMIN_SEED,
  ELECTION_SEED,
  CANDIDATE_SEED,
  VOTER_REGISTRATION_SEED,
  VOTE_RECORD_SEED,
  PROGRAM_ID,
} from './constants';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AdminPermissions {
  canManageElections: boolean;
  canManageCandidates: boolean;
  canManageVoters: boolean;
  canFinalizeResults: boolean;
}

export enum ElectionStatus {
  Draft = 'Draft',
  Active = 'Active',
  Ended = 'Ended',
  Cancelled = 'Cancelled',
  Finalized = 'Finalized',
}

export enum VoterRegistrationType {
  Open = 'Open',
  Whitelist = 'Whitelist',
}

export enum RegistrationStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Revoked = 'Revoked',
}

// ============================================
// PDA HELPER FUNCTIONS
// ============================================

/**
 * Get Admin Registry PDA
 * Seeds: ["admin_registry"]
 */
export function getAdminRegistryPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ADMIN_REGISTRY_SEED)],
    programId
  );
}

/**
 * Get Admin PDA for a specific wallet
 * Seeds: ["admin", admin_pubkey]
 */
export function getAdminPda(
  adminPubkey: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ADMIN_SEED), adminPubkey.toBuffer()],
    programId
  );
}

/**
 * Get Election PDA
 * Seeds: ["election", election_id (u64, little-endian)]
 */
export function getElectionPda(
  electionId: number | BN,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const idBN = typeof electionId === 'number' ? new BN(electionId) : electionId;
  
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(ELECTION_SEED),
      idBN.toArrayLike(Buffer, 'le', 8) // u64 = 8 bytes
    ],
    programId
  );
}

/**
 * Get Candidate PDA
 * Seeds: ["candidate", election_pubkey, candidate_id (u32, little-endian)]
 */
export function getCandidatePda(
  electionPubkey: PublicKey,
  candidateId: number | BN,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const idBN = typeof candidateId === 'number' ? new BN(candidateId) : candidateId;
  
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(CANDIDATE_SEED),
      electionPubkey.toBuffer(),
      idBN.toArrayLike(Buffer, 'le', 4) // u32 = 4 bytes
    ],
    programId
  );
}

/**
 * Get Voter Registration PDA
 * Seeds: ["voter_reg", election_pubkey, voter_pubkey]
 */
export function getVoterRegistrationPda(
  electionPubkey: PublicKey,
  voterPubkey: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(VOTER_REGISTRATION_SEED),
      electionPubkey.toBuffer(),
      voterPubkey.toBuffer()
    ],
    programId
  );
}

/**
 * Get Vote Record PDA
 * Seeds: ["vote", election_pubkey, voter_pubkey]
 */
export function getVoteRecordPda(
  electionPubkey: PublicKey,
  voterPubkey: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(VOTE_RECORD_SEED),
      electionPubkey.toBuffer(),
      voterPubkey.toBuffer()
    ],
    programId
  );
}

// ============================================
// ADMIN PERMISSIONS PRESETS
// ============================================

export const FULL_PERMISSIONS: AdminPermissions = {
  canManageElections: true,
  canManageCandidates: true,
  canManageVoters: true,
  canFinalizeResults: true,
};

export const NO_PERMISSIONS: AdminPermissions = {
  canManageElections: false,
  canManageCandidates: false,
  canManageVoters: false,
  canFinalizeResults: false,
};

export const ELECTION_MANAGER_PERMISSIONS: AdminPermissions = {
  canManageElections: true,
  canManageCandidates: true,
  canManageVoters: false,
  canFinalizeResults: false,
};

export const VOTER_MANAGER_PERMISSIONS: AdminPermissions = {
  canManageElections: false,
  canManageCandidates: false,
  canManageVoters: true,
  canFinalizeResults: false,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get timestamp for a date
 */
export function getTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Convert timestamp to Date
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Format election status for display
 */
export function formatElectionStatus(status: any): string {
  if (typeof status === 'object') {
    // Handle { draft: {} } format from Anchor
    if ('draft' in status) return 'Draft';
    if ('active' in status) return 'Active';
    if ('ended' in status) return 'Ended';
    if ('cancelled' in status) return 'Cancelled';
    if ('finalized' in status) return 'Finalized';
  }
  return String(status);
}

/**
 * Format voter registration type for display
 */
export function formatVoterRegistrationType(type: any): string {
  if (typeof type === 'object') {
    // Handle { open: {} } format from Anchor
    if ('open' in type) return 'Open';
    if ('whitelist' in type) return 'Whitelist';
  }
  return String(type);
}