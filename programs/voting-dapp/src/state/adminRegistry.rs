use anchor_lang::prelude::*;

// ADMIN REGISTRY
#[account]
pub struct AdminRegistry {
    pub super_admin: Pubkey,     
    pub admin_count: u32,         
    pub paused: bool,             
    pub bump: u8,                 
}

impl AdminRegistry {
    pub const SIZE: usize = 8 + 32 + 4 +  1 + 1;   
}
