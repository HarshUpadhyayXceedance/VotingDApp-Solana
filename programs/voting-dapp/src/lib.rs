use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("58Quw5P7YpwDUKeRTqGALAW396WG2qKq6CDepdPTj4VA");

#[program]
pub mod voting_dapp {
    use super::*;

     // ADMIN MANAGEMENT
    pub fn initialize_admin_registry(ctx: Context<InitializeAdminRegistry>) -> Result<()> {
        instructions::admin::initialize_admin_registry(ctx)
    }

    pub fn add_admin(
        ctx: Context<AddAdmin>,
        name: String,
        permissions: state::AdminPermissions,
    ) -> Result<()> {
        instructions::admin::add_admin(ctx, name, permissions)
    }

    pub fn update_admin_permissions(
        ctx: Context<UpdateAdminPermissions>,
        permissions: state::AdminPermissions,
    ) -> Result<()> {
        instructions::admin::update_admin_permissions(ctx, permissions)
    }

    pub fn deactivate_admin(ctx: Context<DeactivateAdmin>) -> Result<()> {
        instructions::admin::deactivate_admin(ctx)
    }

    pub fn pause_system(ctx: Context<PauseSystem>) -> Result<()> {
        instructions::admin::pause_system(ctx)
    }

    pub fn unpause_system(ctx: Context<UnpauseSystem>) -> Result<()> {
        instructions::admin::unpause_system(ctx)
    }

    // ELECTION MANAGEMENT
     pub fn create_election(
        ctx: Context<CreateElection>,
        title: String,
        description: String,
        start_time: i64,
        end_time: i64,
        voter_registration_type: state::VoterRegistrationType,
    ) -> Result<()> {
        instructions::election::create_election(
            ctx,
            title,
            description,
            start_time,
            end_time,
            voter_registration_type,
        )
    }

    pub fn start_election(ctx: Context<StartElection>) -> Result<()> {
        instructions::election::start_election(ctx)
    }

    pub fn end_election(ctx: Context<EndElection>) -> Result<()> {
        instructions::election::end_election(ctx)
    }

    pub fn cancel_election(ctx: Context<CancelElection>) -> Result<()> {
        instructions::election::cancel_election(ctx)
    }

    pub fn finalize_election(ctx: Context<FinalizeElection>) -> Result<()> {
        instructions::election::finalize_election(ctx)
    }

    // CANDIDATE MANAGEMENT
    pub fn add_candidate(
        ctx: Context<AddCandidate>,
        name: String,
        description: String,
        image_url: String,
    ) -> Result<()> {
        instructions::candidate::add_candidate(ctx, name, description, image_url)
    }

    pub fn remove_candidate(ctx: Context<RemoveCandidate>) -> Result<()> {
        instructions::candidate::remove_candidate(ctx)
    }

    // VOTER REGISTRATION
    pub fn request_voter_registration(ctx: Context<RequestVoterRegistration>) -> Result<()> {
        instructions::voter::request_voter_registration(ctx)
    }

    pub fn approve_voter_registration(ctx: Context<ApproveVoterRegistration>) -> Result<()> {
        instructions::voter::approve_voter_registration(ctx)
    }

    pub fn reject_voter_registration(ctx: Context<RejectVoterRegistration>) -> Result<()> {
        instructions::voter::reject_voter_registration(ctx)
    }

    pub fn revoke_voter_registration(ctx: Context<RevokeVoterRegistration>) -> Result<()> {
        instructions::voter::revoke_voter_registration(ctx)
    }

    // VOTING
    pub fn cast_vote(ctx: Context<CastVote>) -> Result<()> {
        instructions::cast_vote::cast_vote(ctx)
    }
}