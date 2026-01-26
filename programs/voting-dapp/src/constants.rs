use anchor_lang::prelude::*;

pub const MAX_TITLE_LENGTH: usize = 64;
pub const MAX_NAME_LENGTH: usize = 32;
pub const MAX_DESCRIPTION_LENGTH: usize = 200;  

pub const SUPER_ADMIN: Pubkey =
    pubkey!("LssxRdEeDV3fLd4y4m3akAPfz3HApTBw9yh7TJvFFhP");