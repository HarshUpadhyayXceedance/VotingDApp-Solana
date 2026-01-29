import { PublicKey } from '@solana/web3.js';

// Your deployed program ID - MUST match Anchor.toml and IDL
export const PROGRAM_ID = new PublicKey('58Quw5P7YpwDUKeRTqGALAW396WG2qKq6CDepdPTj4VA');

// Super admin public key
export const SUPER_ADMIN = new PublicKey('LssxRdEeDV3fLd4y4m3akAPfz3HApTBw9yh7TJvFFhP');

// Admin seed for PDA
export const ADMIN_SEED = 'admin';