use anchor_lang::prelude::*;

#[account]
pub struct VoteRecord {
    pub voter: Pubkey,
    pub election: Pubkey,
}

impl VoteRecord {
    pub const LEN: usize = 8 + 32 + 32;
}
