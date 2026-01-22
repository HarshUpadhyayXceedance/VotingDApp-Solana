use anchor_lang::prelude::*;

#[account]
pub struct Election {
    pub authority: Pubkey,
    pub title: String,
    pub is_active: bool,
    pub total_votes: u64,
}

impl Election {
    pub const LEN: usize = 8 + 32 + 4 + 64 + 1 + 8;
}
