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
    // Using UncheckedAccount to make it truly optional - validation done in function logic
    /// CHECK: Optional voter registration. For Whitelist elections, seeds/bump/status validated in cast_vote function.
    pub voter_registration: UncheckedAccount<'info>,
    
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
        // Manually derive and validate voter registration PDA
        let (expected_voter_reg_pda, expected_bump) = Pubkey::find_program_address(
            &[
                VOTER_REGISTRATION_SEED,
                election.key().as_ref(),
                ctx.accounts.voter.key().as_ref()
            ],
            ctx.program_id
        );

        // Verify the provided account matches the expected PDA
        require!(
            ctx.accounts.voter_registration.key() == expected_voter_reg_pda,
            VotingError::VoterNotRegistered
        );

        // Deserialize and validate the voter registration account
        let voter_reg_data = ctx.accounts.voter_registration.try_borrow_data()?;
        require!(
            !voter_reg_data.is_empty(),
            VotingError::VoterNotRegistered
        );

        let voter_reg = VoterRegistration::try_deserialize(&mut &voter_reg_data[..])?;

        // Verify the account data
        require!(
            voter_reg.bump == expected_bump,
            VotingError::VoterNotRegistered
        );
        require!(
            voter_reg.status == RegistrationStatus::Approved,
            VotingError::VoterNotRegistered
        );
    }
    
    // Record the vote
    vote_record.election = election.key();
    vote_record.voter = ctx.accounts.voter.key();
    vote_record.candidate = candidate.key();
    vote_record.voted_at = clock.unix_timestamp;
    vote_record.bump = ctx.bumps.vote_record;

    // Update vote counts with overflow protection
    candidate.vote_count = candidate.vote_count.saturating_add(1);
    election.total_votes = election.total_votes.saturating_add(1);
    
    msg!("Vote cast successfully");
    msg!("Voter: {}", ctx.accounts.voter.key());
    msg!("Election: {}", election.title);
    msg!("Candidate: {}", candidate.name);
    msg!("Candidate vote count: {}", candidate.vote_count);
    msg!("Total election votes: {}", election.total_votes);
    
    Ok(())
}