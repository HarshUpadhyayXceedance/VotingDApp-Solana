use anchor_lang::prelude::*;

#[account]
pub struct Admin {
    pub authority: Pubkey,              
    pub name: String,                   
    pub permissions: AdminPermissions,   
    pub added_by: Pubkey,                
    pub added_at: i64,                   
    pub is_active: bool,                
    pub bump: u8,            
}

impl Admin {
    pub const SIZE: usize = 8 + 32 + 4 + 50 + 
                        10 + 32 + 8+ 1 +1;
}
