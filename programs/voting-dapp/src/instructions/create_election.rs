use anchor_lang::prelude::*;
use crate::state::Election;

#[derive(Accounts)]
pub struct CreateElection<'info> {
    #[account(
        init,
        payer = authority,
        space = Election::LEN
    )]
    pub election: Account<'info, Election>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_election(ctx: Context<CreateElection>, title: String) -> Result<()> {
    let election = &mut ctx.accounts.election;
    election.authority = ctx.accounts.authority.key();
    election.title = title;
    election.is_active = true;
    election.total_votes = 0;
    Ok(())
}
