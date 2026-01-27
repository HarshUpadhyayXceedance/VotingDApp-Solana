use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::VotingError;
use crate::state::*;

// REQUEST VOTER REGISTRATION
#[derive(Accounts)]
pub struct RequestVoterRegistration<'info> {
    #[account(
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        seeds = [ELECTION_SEED, election.election_id.to_le_bytes().as_ref()],
        bump = election.bump,
        constraint = election.voter_registration_type == VoterRegistrationType::Whitelist @ VotingError::InvalidInput
    )]
    pub election: Account<'info, Election>,
    
    #[account(
        init,
        payer = voter,
        space = VoterRegistration::SIZE,
        seeds = [
            VOTER_REGISTRATION_SEED,
            election.key().as_ref(),
            voter.key().as_ref()
        ],
        bump
    )]
    pub voter_registration: Account<'info, VoterRegistration>,
    
    #[account(mut)]
    pub voter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn request_voter_registration(ctx: Context<RequestVoterRegistration>) -> Result<()> {
    require!(!ctx.accounts.admin_registry.paused, VotingError::SystemPaused);
    
    let voter_registration = &mut ctx.accounts.voter_registration;
    let clock = Clock::get()?;
    
    voter_registration.election = ctx.accounts.election.key();
    voter_registration.voter = ctx.accounts.voter.key();
    voter_registration.status = RegistrationStatus::Pending;
    voter_registration.requested_at = clock.unix_timestamp;
    voter_registration.approved_at = None;
    voter_registration.approved_by = None;
    voter_registration.bump = ctx.bumps.voter_registration;
    
    msg!("Voter registration requested");
    msg!("Voter: {}", ctx.accounts.voter.key());
    msg!("Election: {}", ctx.accounts.election.title);
    
    Ok(())
}

// APPROVE VOTER REGISTRATION
#[derive(Accounts)]
pub struct ApproveVoterRegistration<'info> {
    #[account(
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        seeds = [ADMIN_SEED, authority.key().as_ref()],
        bump = admin_account.bump,
        constraint = admin_account.is_active @ VotingError::AdminNotActive,
        constraint = admin_account.permissions.can_manage_voters @ VotingError::InsufficientPermissions
    )]
    pub admin_account: Account<'info, Admin>,
    
    #[account(
        seeds = [ELECTION_SEED, election.election_id.to_le_bytes().as_ref()],
        bump = election.bump
    )]
    pub election: Account<'info, Election>,
    
    #[account(
        mut,
        seeds = [
            VOTER_REGISTRATION_SEED,
            election.key().as_ref(),
            voter_registration.voter.as_ref()
        ],
        bump = voter_registration.bump,
        constraint = voter_registration.status == RegistrationStatus::Pending @ VotingError::InvalidInput
    )]
    pub voter_registration: Account<'info, VoterRegistration>,
    
    pub authority: Signer<'info>,
}

pub fn approve_voter_registration(ctx: Context<ApproveVoterRegistration>) -> Result<()> {
    require!(!ctx.accounts.admin_registry.paused, VotingError::SystemPaused);
    
    let voter_registration = &mut ctx.accounts.voter_registration;
    let clock = Clock::get()?;
    
    voter_registration.status = RegistrationStatus::Approved;
    voter_registration.approved_at = Some(clock.unix_timestamp);
    voter_registration.approved_by = Some(ctx.accounts.authority.key());
    
    msg!("Voter registration approved");
    msg!("Voter: {}", voter_registration.voter);
    msg!("Approved by: {}", ctx.accounts.authority.key());
    
    Ok(())
}

// REJECT VOTER REGISTRATION
#[derive(Accounts)]
pub struct RejectVoterRegistration<'info> {
    #[account(
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        seeds = [ADMIN_SEED, authority.key().as_ref()],
        bump = admin_account.bump,
        constraint = admin_account.is_active @ VotingError::AdminNotActive,
        constraint = admin_account.permissions.can_manage_voters @ VotingError::InsufficientPermissions
    )]
    pub admin_account: Account<'info, Admin>,
    
    #[account(
        seeds = [ELECTION_SEED, election.election_id.to_le_bytes().as_ref()],
        bump = election.bump
    )]
    pub election: Account<'info, Election>,
    
    #[account(
        mut,
        seeds = [
            VOTER_REGISTRATION_SEED,
            election.key().as_ref(),
            voter_registration.voter.as_ref()
        ],
        bump = voter_registration.bump,
        constraint = voter_registration.status == RegistrationStatus::Pending @ VotingError::InvalidInput
    )]
    pub voter_registration: Account<'info, VoterRegistration>,
    
    pub authority: Signer<'info>,
}

pub fn reject_voter_registration(ctx: Context<RejectVoterRegistration>) -> Result<()> {
    require!(!ctx.accounts.admin_registry.paused, VotingError::SystemPaused);
    
    let voter_registration = &mut ctx.accounts.voter_registration;
    voter_registration.status = RegistrationStatus::Rejected;
    
    msg!("Voter registration rejected");
    msg!("Voter: {}", voter_registration.voter);
    msg!("Rejected by: {}", ctx.accounts.authority.key());
    
    Ok(())
}

// REVOKE VOTER REGISTRATION
#[derive(Accounts)]
pub struct RevokeVoterRegistration<'info> {
    #[account(
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        seeds = [ADMIN_SEED, authority.key().as_ref()],
        bump = admin_account.bump,
        constraint = admin_account.is_active @ VotingError::AdminNotActive,
        constraint = admin_account.permissions.can_manage_voters @ VotingError::InsufficientPermissions
    )]
    pub admin_account: Account<'info, Admin>,
    
    #[account(
        seeds = [ELECTION_SEED, election.election_id.to_le_bytes().as_ref()],
        bump = election.bump
    )]
    pub election: Account<'info, Election>,
    
    #[account(
        mut,
        seeds = [
            VOTER_REGISTRATION_SEED,
            election.key().as_ref(),
            voter_registration.voter.as_ref()
        ],
        bump = voter_registration.bump,
        constraint = voter_registration.status == RegistrationStatus::Approved @ VotingError::InvalidInput
    )]
    pub voter_registration: Account<'info, VoterRegistration>,
    
    pub authority: Signer<'info>,
}

pub fn revoke_voter_registration(ctx: Context<RevokeVoterRegistration>) -> Result<()> {
    require!(!ctx.accounts.admin_registry.paused, VotingError::SystemPaused);
    
    let voter_registration = &mut ctx.accounts.voter_registration;
    voter_registration.status = RegistrationStatus::Revoked;
    
    msg!("Voter registration revoked");
    msg!("Voter: {}", voter_registration.voter);
    msg!("Revoked by: {}", ctx.accounts.authority.key());
    
    Ok(())
}