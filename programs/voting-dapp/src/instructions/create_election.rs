use anchor_lang::prelude::*;
use crate::state::{Election, Admin};

#[derive(Accounts)]
pub struct CreateElection<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"admin", authority.key().as_ref()],
        bump
    )]
    pub admin_account: Account<'info, Admin>,

    #[account(
        init,
        payer = authority,
        space = Election::LEN
    )]
    pub election: Account<'info, Election>,

    pub system_program: Program<'info, System>,
}

pub fn create_election(
    ctx: Context<CreateElection>,
    title: String,
) -> Result<()> {
    let election = &mut ctx.accounts.election;
    election.title = title;
    election.authority = ctx.accounts.authority.key();
    election.is_active = true;
    Ok(())
}
