use anchor_lang::prelude::*;

#[account]
pub struct Election {
    pub authority: Pubkey,       // 32 bytes
    pub title: String,            // 4 + 64 = 68 bytes
    pub description: String,      // 4 + 200 = 204 bytes (NEW)
    pub is_active: bool,          // 1 byte
    pub total_votes: u64,         // 8 bytes
}

impl Election {
    pub const LEN: usize = 8 + 32 + 68 + 204 + 1 + 8;
}