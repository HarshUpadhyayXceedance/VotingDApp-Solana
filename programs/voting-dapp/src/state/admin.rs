use anchor_lang::prelude::*;

#[account]
pub struct Admin {
    pub authority: Pubkey,
}

impl Admin {
    pub const LEN: usize = 8 + 32;
}
