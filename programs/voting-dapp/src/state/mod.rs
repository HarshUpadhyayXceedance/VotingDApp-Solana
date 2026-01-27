use anchor_lang::prelude::*;

pub mod admin;
pub mod admin_permissions;
pub mod admin_registry;
pub mod candidate;
pub mod election;
pub mod vote_record;

pub use admin::*;
pub use admin_permissions::*;
pub use admin_registry::*;
pub use candidate::*;
pub use election::*;
pub use vote_record::*;

// ENUMS
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ElectionStatus {
    Draft,      // Created but not started
    Active,     // Currently accepting votes
    Ended,      // Manually ended
    Cancelled,  // Cancelled by admin
    Finalized,  // Results finalized
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum VoterRegistrationType {
    Open,       // Anyone can vote (no registration needed)
    Whitelist,  // Only approved voters can vote
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RegistrationStatus {
    Pending,   // Waiting for approval
    Approved,  // Approved by admin
    Rejected,  // Rejected by admin
    Revoked,   // Revoked after approval
}

// VOTER REGISTRATION
#[account]
pub struct VoterRegistration {
    pub election: Pubkey,              // Election
    pub voter: Pubkey,                 // Voter wallet
    pub status: RegistrationStatus,    // Registration status
    pub requested_at: i64,             // Request timestamp
    pub approved_at: Option<i64>,      // Approval timestamp
    pub approved_by: Option<Pubkey>,   // Admin who approved
    pub bump: u8,                      // PDA bump
}

impl VoterRegistration {
    pub const SIZE: usize = 8 + // discriminator
        32 + // election
        32 + // voter
        1 +  // status
        8 +  // requested_at
        1 + 8 + // approved_at (Option<i64>)
        1 + 32 + // approved_by (Option<Pubkey>)
        1;   // bump
}