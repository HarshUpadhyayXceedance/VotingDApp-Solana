use anchor_lang::prelude::*;
use super::AdminPermissions;

#[account]
pub struct Admin {
    pub authority: Pubkey,              // Admin wallet address
    pub name: String,                   // Admin name
    pub permissions: AdminPermissions,   // Admin permissions
    pub added_by: Pubkey,                // Who added this admin
    pub added_at: i64,                   // When admin was added
    pub is_active: bool,                 // Active status
    pub bump: u8,                        // PDA bump
}

impl Admin {
    pub const SIZE: usize = 8 +  // discriminator
        32 + // authority
        4 + 50 + // name (String with max 50 chars)
        AdminPermissions::SIZE + // permissions
        32 + // added_by
        8 +  // added_at
        1 +  // is_active
        1;   // bump
}