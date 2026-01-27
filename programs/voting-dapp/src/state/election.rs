use anchor_lang::prelude::*;

#[account]
pub struct Election {
    pub election_id: u64,                            
    pub authority: Pubkey,                           
    pub title: String,                               
    pub description: String,                         
    pub start_time: i64,                             
    pub end_time: i64,                               
    pub status: ElectionStatus,                      
    pub total_votes: u64,                            
    pub candidate_count: u32,                        
    pub voter_registration_type: VoterRegistrationType, 
    pub bump: u8,                                    
}

impl Election {
    pub const SIZE: usize = 8 + // discriminator
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
}