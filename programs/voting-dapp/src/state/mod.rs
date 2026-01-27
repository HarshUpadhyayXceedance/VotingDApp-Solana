pub mod election;
pub mod candidate;
pub mod vote_record;
pub mod admin;

pub use election::Election;
pub use candidate::Candidate;
pub use vote_record::VoteRecord;
pub use admin::Admin;




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

// ============================================
// CANDIDATE
// ============================================


// ============================================
// VOTER REGISTRATION
// ============================================

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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RegistrationStatus {
    Pending,   // Waiting for approval
    Approved,  // Approved by admin
    Rejected,  // Rejected by admin
    Revoked,   // Revoked after approval
}
