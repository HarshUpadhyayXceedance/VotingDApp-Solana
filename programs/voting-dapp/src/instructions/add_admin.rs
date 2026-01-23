use anchor_lang::prelude::*;
use crate::state::Admin;
use crate::constants::SUPER_ADMIN;
use crate::errors::VotingError;

#[derive(Accounts)]
pub struct AddAdmin<'info> {
    #[account(mut, signer)]
    pub super_admin: Signer<'info>,

    #[account(
        init,
        payer = super_admin,
        space = Admin::LEN,
        seeds = [b"admin", admin.key().as_ref()],
        bump
    )]
    pub admin_account: Account<'info, Admin>,

    /// CHECK: wallet being promoted to admin
    pub admin: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn add_admin(ctx: Context<AddAdmin>) -> Result<()> {
    require!(
        ctx.accounts.super_admin.key() == SUPER_ADMIN,
        VotingError::Unauthorized
    );

    ctx.accounts.admin_account.authority = ctx.accounts.admin.key();
    Ok(())
}
