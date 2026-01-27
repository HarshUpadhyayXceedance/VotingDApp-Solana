use anchor_lang::prelude::*;

#[account]
pub struct Candidate {
    pub election: Pubkey,         
    pub candidate_id: u32,        
    pub name: String,             
    pub description: String,      
    pub image_url: String,        
    pub vote_count: u64,          
    pub added_by: Pubkey,         
    pub added_at: i64,            
    pub bump: u8,                 
}

impl Candidate {
    pub const SIZE: usize = 8 + // discriminator
        32 + // election
        4 +  // candidate_id
        4 + 50 + // name (String with max 50 chars)
        4 + 500 + // description (String with max 500 chars)
        4 + 200 + // image_url (String with max 200 chars, default empty)
        8 +  // vote_count
        32 + // added_by
        8 +  // added_at
        1;   // bump
}
