use anchor_lang::prelude::*;
use crate::state::{Election, Candidate, VoteRecord};
use crate::errors::VotingError;

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,

    #[account(mut)]
    pub candidate: Account<'info, Candidate>,

    #[account(
        init,
        payer = voter,
        space = VoteRecord::LEN,
        seeds = [b"vote", voter.key().as_ref(), election.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(mut)]
    pub voter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn cast_vote(ctx: Context<CastVote>) -> Result<()> {
    let election = &mut ctx.accounts.election;

    require!(election.is_active, VotingError::ElectionClosed);

    ctx.accounts.candidate.votes += 1;
    election.total_votes += 1;

    ctx.accounts.vote_record.voter = ctx.accounts.voter.key();
    ctx.accounts.vote_record.election = election.key();

    Ok(())
}
