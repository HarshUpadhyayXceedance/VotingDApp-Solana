use anchor_lang::prelude::*;

#[account]
pub struct Candidate {
    pub election: Pubkey,
    pub name: String,
    pub votes: u64,
}

impl Candidate {
    pub const LEN: usize = 8 + 32 + 4 + 32 + 8;
}
