use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("2V9BTFvNVqKszMMsgFgVyLDv1LfjpCFJCn62rQvvUCVR");

#[program]
pub mod voting {
    use super::*;

    pub fn create_election(ctx: Context<CreateElection>, title: String) -> Result<()> {
        instructions::create_election(ctx, title)
    }

    pub fn add_candidate(ctx: Context<AddCandidate>, name: String) -> Result<()> {
        instructions::add_candidate(ctx, name)
    }

    pub fn cast_vote(ctx: Context<CastVote>) -> Result<()> {
        instructions::cast_vote(ctx)
    }

    pub fn close_election(ctx: Context<CloseElection>) -> Result<()> {
        instructions::close_election(ctx)
    }
}
