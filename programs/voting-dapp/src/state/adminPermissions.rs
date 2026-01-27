use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub struct AdminPermissions {
    pub can_manage_elections: bool,
    pub can_manage_candidates: bool,
    pub can_manage_voters: bool,
    pub can_finalize_results: bool,
}

impl AdminPermissions {
    pub const SIZE: usize = 1 + 1 + 1 + 1;

    pub fn full_permissions() -> Self {
        Self {
            can_manage_elections: true,
            can_manage_candidates: true,
            can_manage_voters: true,
            can_finalize_results: true,
        }
    }

    pub fn no_permissions() -> Self {
        Self {
            can_manage_elections: false,
            can_manage_candidates: false,
            can_manage_voters: false,
            can_finalize_results: false,
        }
    }
}
