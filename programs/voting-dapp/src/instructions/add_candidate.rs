use anchor_lang::prelude::*;
use crate::state::{Election, Candidate};

#[derive(Accounts)]
pub struct AddCandidate<'info> {
    #[account(mut, has_one = authority)]
    pub election: Account<'info, Election>,

    #[account(
        init,
        payer = authority,
        space = Candidate::LEN
    )]
    pub candidate: Account<'info, Candidate>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn add_candidate(ctx: Context<AddCandidate>, name: String) -> Result<()> {
    let candidate = &mut ctx.accounts.candidate;
    candidate.election = ctx.accounts.election.key();
    candidate.name = name;
    candidate.votes = 0;
    Ok(())
}
