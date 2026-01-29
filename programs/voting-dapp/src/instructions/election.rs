use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::VotingError;
use crate::state::*;

// CREATE ELECTION
#[derive(Accounts)]
#[instruction(title: String, description: String)]
pub struct CreateElection<'info> {
    #[account(
        mut, // MUTABLE to increment election_count
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        seeds = [ADMIN_SEED, authority.key().as_ref()],
        bump = admin_account.bump,
        constraint = admin_account.is_active @ VotingError::AdminNotActive,
        constraint = admin_account.permissions.can_manage_elections @ VotingError::InsufficientPermissions
    )]
    pub admin_account: Account<'info, Admin>,
    
    #[account(
        init,
        payer = authority,
        space = Election::SIZE,
        seeds = [ELECTION_SEED, &admin_registry.election_count.to_le_bytes()],
        bump
    )]
    pub election: Account<'info, Election>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_election(
    ctx: Context<CreateElection>,
    title: String,
    description: String,
    start_time: i64,
    end_time: i64,
    voter_registration_type: VoterRegistrationType,
) -> Result<()> {
    require!(!ctx.accounts.admin_registry.paused, VotingError::SystemPaused);
    
    require!(
        title.len() <= MAX_TITLE_LENGTH,
        VotingError::TitleTooLong
    );
    
    require!(
        description.len() <= MAX_DESCRIPTION_LENGTH,
        VotingError::DescriptionTooLong
    );
    
    require!(
        end_time > start_time,
        VotingError::InvalidTimeRange
    );
    
    // Increment election count first (use current as ID)
    let election_id = ctx.accounts.admin_registry.election_count;
    ctx.accounts.admin_registry.election_count = election_id.checked_add(1).unwrap();
    
    let election = &mut ctx.accounts.election;
    let clock = Clock::get()?;
    
    election.election_id = election_id;
    election.authority = ctx.accounts.authority.key();
    election.title = title;
    election.description = description;
    election.start_time = start_time;
    election.end_time = end_time;
    election.status = ElectionStatus::Draft;
    election.total_votes = 0;
    election.candidate_count = 0;
    election.voter_registration_type = voter_registration_type;
    election.bump = ctx.bumps.election;
    
    msg!("Election created");
    msg!("Election ID: {}", election.election_id);
    msg!("Title: {}", election.title);
    msg!("Status: Draft");
    
    Ok(())
}

// START ELECTION
#[derive(Accounts)]
pub struct StartElection<'info> {
    #[account(
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        seeds = [ADMIN_SEED, authority.key().as_ref()],
        bump = admin_account.bump,
        constraint = admin_account.is_active @ VotingError::AdminNotActive,
        constraint = admin_account.permissions.can_manage_elections @ VotingError::InsufficientPermissions
    )]
    pub admin_account: Account<'info, Admin>,
    
    #[account(
        mut,
        seeds = [ELECTION_SEED, election.election_id.to_le_bytes().as_ref()],
        bump = election.bump,
        constraint = election.status == ElectionStatus::Draft @ VotingError::ElectionAlreadyActive
    )]
    pub election: Account<'info, Election>,
    
    pub authority: Signer<'info>,
}

pub fn start_election(ctx: Context<StartElection>) -> Result<()> {
    require!(!ctx.accounts.admin_registry.paused, VotingError::SystemPaused);
    
    let election = &mut ctx.accounts.election;
    let clock = Clock::get()?;
    
    require!(
        election.candidate_count > 0,
        VotingError::InvalidInput
    );
    
    election.status = ElectionStatus::Active;
    
    msg!("Election started");
    msg!("Election ID: {}", election.election_id);
    msg!("Title: {}", election.title);
    
    Ok(())
}

// END ELECTION
#[derive(Accounts)]
pub struct EndElection<'info> {
    #[account(
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        seeds = [ADMIN_SEED, authority.key().as_ref()],
        bump = admin_account.bump,
        constraint = admin_account.is_active @ VotingError::AdminNotActive,
        constraint = admin_account.permissions.can_manage_elections @ VotingError::InsufficientPermissions
    )]
    pub admin_account: Account<'info, Admin>,
    
    #[account(
        mut,
        seeds = [ELECTION_SEED, election.election_id.to_le_bytes().as_ref()],
        bump = election.bump,
        constraint = election.status == ElectionStatus::Active @ VotingError::ElectionNotActive
    )]
    pub election: Account<'info, Election>,
    
    pub authority: Signer<'info>,
}

pub fn end_election(ctx: Context<EndElection>) -> Result<()> {
    require!(!ctx.accounts.admin_registry.paused, VotingError::SystemPaused);
    
    let election = &mut ctx.accounts.election;
    election.status = ElectionStatus::Ended;
    
    msg!("Election ended");
    msg!("Election ID: {}", election.election_id);
    msg!("Total votes: {}", election.total_votes);
    
    Ok(())
}

// CANCEL ELECTION
#[derive(Accounts)]
pub struct CancelElection<'info> {
    #[account(
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        seeds = [ADMIN_SEED, authority.key().as_ref()],
        bump = admin_account.bump,
        constraint = admin_account.is_active @ VotingError::AdminNotActive,
        constraint = admin_account.permissions.can_manage_elections @ VotingError::InsufficientPermissions
    )]
    pub admin_account: Account<'info, Admin>,
    
    #[account(
        mut,
        seeds = [ELECTION_SEED, election.election_id.to_le_bytes().as_ref()],
        bump = election.bump
    )]
    pub election: Account<'info, Election>,
    
    pub authority: Signer<'info>,
}

pub fn cancel_election(ctx: Context<CancelElection>) -> Result<()> {
    require!(!ctx.accounts.admin_registry.paused, VotingError::SystemPaused);
    
    let election = &mut ctx.accounts.election;
    
    require!(
        election.status != ElectionStatus::Finalized,
        VotingError::ElectionFinalized
    );
    
    election.status = ElectionStatus::Cancelled;
    
    msg!("Election cancelled");
    msg!("Election ID: {}", election.election_id);
    
    Ok(())
}

// FINALIZE ELECTION
#[derive(Accounts)]
pub struct FinalizeElection<'info> {
    #[account(
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        seeds = [ADMIN_SEED, authority.key().as_ref()],
        bump = admin_account.bump,
        constraint = admin_account.is_active @ VotingError::AdminNotActive,
        constraint = admin_account.permissions.can_finalize_results @ VotingError::InsufficientPermissions
    )]
    pub admin_account: Account<'info, Admin>,
    
    #[account(
        mut,
        seeds = [ELECTION_SEED, election.election_id.to_le_bytes().as_ref()],
        bump = election.bump,
        constraint = election.status == ElectionStatus::Ended @ VotingError::InvalidInput
    )]
    pub election: Account<'info, Election>,
    
    pub authority: Signer<'info>,
}

pub fn finalize_election(ctx: Context<FinalizeElection>) -> Result<()> {
    require!(!ctx.accounts.admin_registry.paused, VotingError::SystemPaused);
    
    let election = &mut ctx.accounts.election;
    election.status = ElectionStatus::Finalized;
    
    msg!("Election finalized");
    msg!("Election ID: {}", election.election_id);
    msg!("Total votes: {}", election.total_votes);
    
    Ok(())
}