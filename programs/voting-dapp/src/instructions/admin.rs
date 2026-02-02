use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::VotingError;
use crate::state::*;

// INITIALIZE ADMIN REGISTRY
#[derive(Accounts)]
pub struct InitializeAdminRegistry<'info> {
    #[account(
        init,
        payer = super_admin,
        space = AdminRegistry::SIZE,
        seeds = [ADMIN_REGISTRY_SEED],
        bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(mut)]
    pub super_admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_admin_registry(ctx: Context<InitializeAdminRegistry>) -> Result<()> {
    require!(
        ctx.accounts.super_admin.key() == SUPER_ADMIN,
        VotingError::Unauthorized
    );
    
    let admin_registry = &mut ctx.accounts.admin_registry;
    admin_registry.super_admin = ctx.accounts.super_admin.key();
    admin_registry.admin_count = 0;
    admin_registry.election_count = 0;
    admin_registry.paused = false;
    admin_registry.bump = ctx.bumps.admin_registry;
    
    msg!("Admin registry initialized");
    msg!("Super admin: {}", ctx.accounts.super_admin.key());
    
    Ok(())
}

// ADD ADMIN
#[derive(Accounts)]
#[instruction(name: String)]
pub struct AddAdmin<'info> {
    #[account(
        mut,
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        init,
        payer = super_admin,
        space = Admin::SIZE,
        seeds = [ADMIN_SEED, new_admin.key().as_ref()],
        bump
    )]
    pub admin_account: Account<'info, Admin>,
    
    /// CHECK: The wallet being promoted to admin
    pub new_admin: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub super_admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn add_admin(
    ctx: Context<AddAdmin>,
    name: String,
    permissions: AdminPermissions,
) -> Result<()> {
    require!(
        ctx.accounts.super_admin.key() == SUPER_ADMIN,
        VotingError::Unauthorized
    );

    // Validate admin name (required, non-empty)
    require!(
        !name.trim().is_empty(),
        VotingError::InvalidInput
    );
    require!(
        name.len() <= MAX_NAME_LENGTH,
        VotingError::NameTooLong
    );
    
    let admin_account = &mut ctx.accounts.admin_account;
    let admin_registry = &mut ctx.accounts.admin_registry;
    let clock = Clock::get()?;
    
    admin_account.authority = ctx.accounts.new_admin.key();
    admin_account.name = name;
    admin_account.permissions = permissions;
    admin_account.added_by = ctx.accounts.super_admin.key();
    admin_account.added_at = clock.unix_timestamp;
    admin_account.is_active = true;
    admin_account.bump = ctx.bumps.admin_account;
    
    admin_registry.admin_count += 1;
    
    msg!("Admin added successfully");
    msg!("Admin: {}", ctx.accounts.new_admin.key());
    msg!("Name: {}", admin_account.name);
    msg!("Total admins: {}", admin_registry.admin_count);
    
    Ok(())
}

// UPDATE ADMIN PERMISSIONS
#[derive(Accounts)]
pub struct UpdateAdminPermissions<'info> {
    #[account(
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        mut,
        seeds = [ADMIN_SEED, admin_account.authority.as_ref()],
        bump = admin_account.bump
    )]
    pub admin_account: Account<'info, Admin>,
    
    pub super_admin: Signer<'info>,
}

pub fn update_admin_permissions(
    ctx: Context<UpdateAdminPermissions>,
    permissions: AdminPermissions,
) -> Result<()> {
    require!(
        ctx.accounts.super_admin.key() == SUPER_ADMIN,
        VotingError::Unauthorized
    );
    
    let admin_account = &mut ctx.accounts.admin_account;
    admin_account.permissions = permissions;
    
    msg!("Admin permissions updated");
    msg!("Admin: {}", admin_account.authority);
    
    Ok(())
}

// DEACTIVATE ADMIN
#[derive(Accounts)]
pub struct DeactivateAdmin<'info> {
    #[account(
        mut,
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    #[account(
        mut,
        seeds = [ADMIN_SEED, admin_account.authority.as_ref()],
        bump = admin_account.bump
    )]
    pub admin_account: Account<'info, Admin>,
    
    pub super_admin: Signer<'info>,
}

pub fn deactivate_admin(ctx: Context<DeactivateAdmin>) -> Result<()> {
    require!(
        ctx.accounts.super_admin.key() == SUPER_ADMIN,
        VotingError::Unauthorized
    );
    
    let admin_account = &mut ctx.accounts.admin_account;
    let admin_registry = &mut ctx.accounts.admin_registry;
    
    require!(admin_account.is_active, VotingError::AdminNotActive);
    
    admin_account.is_active = false;
    admin_registry.admin_count = admin_registry.admin_count.saturating_sub(1);
    
    msg!("Admin deactivated");
    msg!("Admin: {}", admin_account.authority);
    
    Ok(())
}

// PAUSE SYSTEM
#[derive(Accounts)]
pub struct PauseSystem<'info> {
    #[account(
        mut,
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,
    
    pub super_admin: Signer<'info>,
}

pub fn pause_system(ctx: Context<PauseSystem>) -> Result<()> {
    require!(
        ctx.accounts.super_admin.key() == SUPER_ADMIN,
        VotingError::Unauthorized
    );
    
    let admin_registry = &mut ctx.accounts.admin_registry;
    admin_registry.paused = true;
    
    msg!("System paused");
    
    Ok(())
}

// UNPAUSE SYSTEM
#[derive(Accounts)]
pub struct UnpauseSystem<'info> {
    #[account(
        mut,
        seeds = [ADMIN_REGISTRY_SEED],
        bump = admin_registry.bump
    )]
    pub admin_registry: Account<'info, AdminRegistry>,

    pub super_admin: Signer<'info>,
}

pub fn unpause_system(ctx: Context<UnpauseSystem>) -> Result<()> {
    require!(
        ctx.accounts.super_admin.key() == SUPER_ADMIN,
        VotingError::Unauthorized
    );

    let admin_registry = &mut ctx.accounts.admin_registry;
    admin_registry.paused = false;

    msg!("System unpaused");

    Ok(())
}

// CLOSE ADMIN REGISTRY (Emergency reset for incompatible structures)
#[derive(Accounts)]
pub struct CloseAdminRegistry<'info> {
    #[account(mut)]
    /// CHECK: Using UncheckedAccount to handle incompatible structures - manually validated
    pub admin_registry: UncheckedAccount<'info>,

    #[account(mut)]
    pub super_admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn close_admin_registry(ctx: Context<CloseAdminRegistry>) -> Result<()> {
    require!(
        ctx.accounts.super_admin.key() == SUPER_ADMIN,
        VotingError::Unauthorized
    );

    // Verify this is the correct PDA
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[ADMIN_REGISTRY_SEED],
        ctx.program_id
    );
    require!(
        ctx.accounts.admin_registry.key() == expected_pda,
        VotingError::Unauthorized
    );

    // Transfer all lamports to super admin (closes the account)
    let dest_starting_lamports = ctx.accounts.super_admin.lamports();
    **ctx.accounts.super_admin.lamports.borrow_mut() = dest_starting_lamports
        .checked_add(ctx.accounts.admin_registry.lamports())
        .unwrap();
    **ctx.accounts.admin_registry.lamports.borrow_mut() = 0;

    msg!("Admin registry closed - rent returned to super admin");
    msg!("Super admin can now reinitialize with correct structure");

    Ok(())
}