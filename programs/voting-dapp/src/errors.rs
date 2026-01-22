use anchor_lang::prelude::*;

#[error_code]
pub enum VotingError {
    #[msg("Election is not active")]
    ElectionClosed,

    #[msg("Already voted")]
    AlreadyVoted,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Title length exceeds maximum allowed")]
    TitleTooLong,
    #[msg("Candidate name length exceeds maximum allowed")]
    NameTooLong,
 
}
