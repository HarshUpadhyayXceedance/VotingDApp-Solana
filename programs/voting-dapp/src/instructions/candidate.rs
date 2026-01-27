use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::VotingError;
use crate::state::*;

// ADD CANDIDATE
#[derive(Accounts)]
#[instruction(name: String, description: String, image_url: String)]
pub struct AddCandidate<'info> {
    #[account(
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        seeds = [ADMIN_SEED, authority.key().as_ref()],
        bump = admin_account.bump,
        constraint = admin_account.is_active @ VotingError::AdminNotActive,
        constraint = admin_account.permissions.can_manage_candidates @ VotingError::InsufficientPermissions
    )]
    pub admin_account: Account<'info, Admin>,
    
    #[account(
        mut,
        seeds = [ELECTION_SEED, election.election_id.to_le_bytes().as_ref()],
        bump = election.bump,
        constraint = election.status == ElectionStatus::Draft @ VotingError::CannotModifyActiveElection
    )]
    pub election: Account<'info, Election>,
    
    #[account(
        init,
        payer = authority,
        space = Candidate::SIZE,
        seeds = [
            CANDIDATE_SEED,
            election.key().as_ref(),
            election.candidate_count.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub candidate: Account<'info, Candidate>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn add_candidate(
    ctx: Context<AddCandidate>,
    name: String,
    description: String,
    image_url: String,
) -> Result<()> {
    require!(!ctx.accounts.admin_registry.paused, VotingError::SystemPaused);
    
    require!(
        name.len() <= MAX_NAME_LENGTH,
        VotingError::NameTooLong
    );
    
    require!(
        description.len() <= MAX_DESCRIPTION_LENGTH,
        VotingError::DescriptionTooLong
    );
    
    require!(
        image_url.len() <= MAX_IMAGE_URL_LENGTH,
        VotingError::ImageUrlTooLong
    );
    
    let candidate = &mut ctx.accounts.candidate;
    let election = &mut ctx.accounts.election;
    let clock = Clock::get()?;
    
    candidate.election = election.key();
    candidate.candidate_id = election.candidate_count;
    candidate.name = name;
    candidate.description = description;
    candidate.image_url = image_url;
    candidate.vote_count = 0;
    candidate.added_by = ctx.accounts.authority.key();
    candidate.added_at = clock.unix_timestamp;
    candidate.bump = ctx.bumps.candidate;
    
    election.candidate_count += 1;
    
    msg!("Candidate added");
    msg!("Election: {}", election.title);
    msg!("Candidate: {}", candidate.name);
    msg!("Candidate ID: {}", candidate.candidate_id);
    
    Ok(())
}

// REMOVE CANDIDATE
#[derive(Accounts)]
pub struct RemoveCandidate<'info> {
    #[account(
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        seeds = [ADMIN_SEED, authority.key().as_ref()],
        bump = admin_account.bump,
        constraint = admin_account.is_active @ VotingError::AdminNotActive,
        constraint = admin_account.permissions.can_manage_candidates @ VotingError::InsufficientPermissions
    )]
    pub admin_account: Account<'info, Admin>,
    
    #[account(
        mut,
        seeds = [ELECTION_SEED, election.election_id.to_le_bytes().as_ref()],
        bump = election.bump,
        constraint = election.status == ElectionStatus::Draft @ VotingError::CannotModifyActiveElection
    )]
    pub election: Account<'info, Election>,
    
    #[account(
        mut,
        close = authority,
        seeds = [
            CANDIDATE_SEED,
            election.key().as_ref(),
            candidate.candidate_id.to_le_bytes().as_ref()
        ],
        bump = candidate.bump
    )]
    pub candidate: Account<'info, Candidate>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn remove_candidate(ctx: Context<RemoveCandidate>) -> Result<()> {
    require!(!ctx.accounts.admin_registry.paused, VotingError::SystemPaused);
    
    let election = &mut ctx.accounts.election;
    let candidate = &ctx.accounts.candidate;
    
    election.candidate_count = election.candidate_count.saturating_sub(1);
    
    msg!("Candidate removed");
    msg!("Election: {}", election.title);
    msg!("Candidate: {}", candidate.name);
    
    Ok(())
}