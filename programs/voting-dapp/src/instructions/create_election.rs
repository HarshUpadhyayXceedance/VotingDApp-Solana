use anchor_lang::prelude::*;
use crate::state::{Election, Admin};
use crate::constants::{MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH};
use crate::errors::VotingError;

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
    description: String,  
) -> Result<()> {
    
    require!(
        title.len() <= MAX_TITLE_LENGTH,
        VotingError::TitleTooLong
    );

    // Validate description length (NEW)
    require!(
        description.len() <= MAX_DESCRIPTION_LENGTH,
        VotingError::DescriptionTooLong
    );

    let election = &mut ctx.accounts.election;
    election.title = title;
    election.description = description;  // NEW FIELD
    election.authority = ctx.accounts.authority.key();
    election.is_active = true;
    election.total_votes = 0; 
    
    Ok(())
}