use anchor_lang::prelude::*;

// String length limits
pub const MAX_TITLE_LENGTH: usize = 100;
pub const MAX_DESCRIPTION_LENGTH: usize = 500;
pub const MAX_NAME_LENGTH: usize = 50;
pub const MAX_IMAGE_URL_LENGTH: usize = 200;

// PDA seeds
pub const ADMIN_REGISTRY_SEED: &[u8] = b"admin_registry";
pub const ADMIN_SEED: &[u8] = b"admin";
pub const ELECTION_SEED: &[u8] = b"election";
pub const CANDIDATE_SEED: &[u8] = b"candidate";
pub const VOTER_REGISTRATION_SEED: &[u8] = b"voter_reg";
pub const VOTE_RECORD_SEED: &[u8] = b"vote";

pub const SUPER_ADMIN: Pubkey = pubkey!("LssxRdEeDV3fLd4y4m3akAPfz3HApTBw9yh7TJvFFhP");