use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::VotingError;
use crate::state::*;

// CAST VOTE
#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        mut,
        seeds = [ELECTION_SEED, election.election_id.to_le_bytes().as_ref()],
        bump = election.bump,
        constraint = election.status == ElectionStatus::Active @ VotingError::ElectionNotActive
    )]
    pub election: Account<'info, Election>,
    
    #[account(
        mut,
        seeds = [
            CANDIDATE_SEED,
            election.key().as_ref(),
            candidate.candidate_id.to_le_bytes().as_ref()
        ],
        bump = candidate.bump,
        constraint = candidate.election == election.key() @ VotingError::InvalidCandidate
    )]
    pub candidate: Account<'info, Candidate>,
    
    // Voter registration check (only for Whitelist elections)
    #[account(
        seeds = [
            VOTER_REGISTRATION_SEED,
            election.key().as_ref(),
            voter.key().as_ref()
        ],
        bump = voter_registration.bump,
        constraint = voter_registration.status == RegistrationStatus::Approved @ VotingError::VoterNotRegistered
    )]
    pub voter_registration: Option<Account<'info, VoterRegistration>>,
    
    #[account(
        init,
        payer = voter,
        space = VoteRecord::SIZE,
        seeds = [
            VOTE_RECORD_SEED,
            election.key().as_ref(),
            voter.key().as_ref()
        ],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    
    #[account(mut)]
    pub voter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn cast_vote(ctx: Context<CastVote>) -> Result<()> {
    require!(!ctx.accounts.admin_registry.paused, VotingError::SystemPaused);
    
    let election = &mut ctx.accounts.election;
    let candidate = &mut ctx.accounts.candidate;
    let vote_record = &mut ctx.accounts.vote_record;
    let clock = Clock::get()?;
    
    // Check if election time is valid
    require!(
        election.status == ElectionStatus::Active,
        VotingError::ElectionNotActive
    );
    
    // Check if election requires voter registration
    if election.voter_registration_type == VoterRegistrationType::Whitelist {
        require!(
            ctx.accounts.voter_registration.is_some(),
            VotingError::VoterNotRegistered
        );
    }
    
    // Record the vote
    vote_record.election = election.key();
    vote_record.voter = ctx.accounts.voter.key();
    vote_record.candidate = candidate.key();
    vote_record.voted_at = clock.unix_timestamp;
    vote_record.bump = ctx.bumps.vote_record;
    
    // Update vote counts
    candidate.vote_count += 1;
    election.total_votes += 1;
    
    msg!("Vote cast successfully");
    msg!("Voter: {}", ctx.accounts.voter.key());
    msg!("Election: {}", election.title);
    msg!("Candidate: {}", candidate.name);
    msg!("Candidate vote count: {}", candidate.vote_count);
    msg!("Total election votes: {}", election.total_votes);
    
    Ok(())
}