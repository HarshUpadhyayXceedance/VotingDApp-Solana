use anchor_lang::prelude::*;
use crate::state::{Election, Candidate, Admin};
use crate::constants::{MAX_NAME_LENGTH, ADMIN_SEED};
use crate::errors::VotingError;

#[derive(Accounts)]
pub struct AddCandidate<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,

    #[account(
        init,
        payer = authority,
        space = Candidate::LEN
    )]
    pub candidate: Account<'info, Candidate>,

    #[account(
        seeds = [b"admin", authority.key().as_ref()],
        bump
    )]
    pub admin_account: Account<'info, Admin>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn add_candidate(ctx: Context<AddCandidate>, name: String) -> Result<()> {
    require!(
        name.len() <= MAX_NAME_LENGTH,
        VotingError::NameTooLong
    );

    require!(
        ctx.accounts.election.is_active,
        VotingError::ElectionClosed
    );

    let candidate = &mut ctx.accounts.candidate;
    candidate.election = ctx.accounts.election.key();
    candidate.name = name;
    candidate.votes = 0;
    
    Ok(())
}