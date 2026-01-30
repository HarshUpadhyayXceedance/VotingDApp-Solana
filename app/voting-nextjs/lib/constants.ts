import { PublicKey } from '@solana/web3.js';

// ============================================
// PROGRAM CONFIGURATION
// ============================================

// Your deployed program ID (from lib.rs)
export const PROGRAM_ID = new PublicKey('58Quw5P7YpwDUKeRTqGALAW396WG2qKq6CDepdPTj4VA');

// Super admin public key (from constants.rs)
export const SUPER_ADMIN = new PublicKey('LssxRdEeDV3fLd4y4m3akAPfz3HApTBw9yh7TJvFFhP');

// ============================================
// PDA SEEDS (from constants.rs)
// ============================================

export const ADMIN_REGISTRY_SEED = 'admin_registry';
export const ADMIN_SEED = 'admin';
export const ELECTION_SEED = 'election';
export const CANDIDATE_SEED = 'candidate';
export const VOTER_REGISTRATION_SEED = 'voter_reg';
export const VOTE_RECORD_SEED = 'vote';

// ============================================
// STRING LENGTH LIMITS (from constants.rs)
// ============================================

export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_NAME_LENGTH = 50;
export const MAX_IMAGE_URL_LENGTH = 200;