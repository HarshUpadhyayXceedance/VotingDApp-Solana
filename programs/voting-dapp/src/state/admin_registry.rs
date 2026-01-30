use anchor_lang::prelude::*;

#[account]
pub struct AdminRegistry {
    pub super_admin: Pubkey,
    pub election_count: u64,      
    pub admin_count: u32,      
    pub paused: bool,             
    pub bump: u8,                 
}

impl AdminRegistry {
    pub const SIZE: usize = 8 +  // discriminator
        32 + // super_admin
        4 +  // admin_count
        8 +  // election_count
        1 +  // paused
        1;   // bump
}