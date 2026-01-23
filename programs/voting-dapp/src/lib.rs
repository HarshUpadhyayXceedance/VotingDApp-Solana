use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("2V9BTFvNVqKszMMsgFgVyLDv1LfjpCFJCn62rQvvUCVR");


#[program]
pub mod voting_dapp {
    use super::*;

    pub fn add_admin(ctx: Context<AddAdmin>) -> Result<()> {
        instructions::add_admin::add_admin(ctx)
    }

    pub fn create_election(
        ctx: Context<CreateElection>,
        title: String,
    ) -> Result<()> {
        instructions::create_election::create_election(ctx, title)
    }

    pub fn add_candidate(
        ctx: Context<AddCandidate>,
        name: String,
    ) -> Result<()> {
        instructions::add_candidate::add_candidate(ctx, name)
    }

    pub fn cast_vote(ctx: Context<CastVote>) -> Result<()> {
        instructions::cast_vote::cast_vote(ctx)
    }

    pub fn close_election(ctx: Context<CloseElection>) -> Result<()> {
        instructions::close_election::close_election(ctx)
    }
}
