use anchor_lang::prelude::*;
use super::{ElectionStatus, VoterRegistrationType};

#[account]
pub struct Election {
    pub election_id: u64,                            // Unique election ID
    pub authority: Pubkey,                           // Admin who created
    pub title: String,                               // Election title
    pub description: String,                         // Election description
    pub start_time: i64,                             // Start timestamp
    pub end_time: i64,                               // End timestamp
    pub status: ElectionStatus,                      // Current status
    pub total_votes: u64,                            // Total votes cast
    pub candidate_count: u32,                        // Number of candidates
    pub voter_registration_type: VoterRegistrationType, // Registration type
    pub bump: u8,                                    // PDA bump
}

impl Election {
    pub const SIZE: usize = 8 +  // discriminator
        8 +  // election_id
        32 + // authority
        4 + 100 + // title (String with max 100 chars)
        4 + 500 + // description (String with max 500 chars)
        8 +  // start_time
        8 +  // end_time
        1 +  // status
        8 +  // total_votes
        4 +  // candidate_count
        1 +  // voter_registration_type
        1;   // bump

    pub fn is_active(&self) -> bool {
        self.status == ElectionStatus::Active
    }

    pub fn can_vote(&self, current_time: i64) -> bool {
        self.status == ElectionStatus::Active 
            && current_time >= self.start_time 
            && current_time <= self.end_time
    }

    pub fn can_be_modified(&self) -> bool {
        self.status == ElectionStatus::Draft
    }
}