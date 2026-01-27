use anchor_lang::prelude::*;

#[account]
pub struct VoteRecord {
    pub election: Pubkey,      // Election
    pub voter: Pubkey,         // Voter wallet
    pub candidate: Pubkey,     // Candidate voted for
    pub voted_at: i64,         // Vote timestamp
    pub bump: u8,              // PDA bump
}

impl VoteRecord {
    pub const SIZE: usize = 8 + // discriminator
        32 + // election
        32 + // voter
        32 + // candidate
        8 +  // voted_at
        1;   // bump
}