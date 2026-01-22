use anchor_lang::prelude::*;
use crate::state::Election;
use crate::errors::VotingError;

#[derive(Accounts)]
pub struct CloseElection<'info> {
    #[account(mut, has_one = authority)]
    pub election: Account<'info, Election>,

    pub authority: Signer<'info>,
}

pub fn close_election(ctx: Context<CloseElection>) -> Result<()> {
    let election = &mut ctx.accounts.election;

    require!(election.is_active, VotingError::ElectionClosed);

    election.is_active = false;
    Ok(())
}
