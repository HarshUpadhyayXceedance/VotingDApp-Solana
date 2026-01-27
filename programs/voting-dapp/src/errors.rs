use anchor_lang::prelude::*;

#[error_code]
pub enum VotingError {
    // General errors
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("System is paused")]
    SystemPaused,
    
    // Admin errors
    #[msg("Insufficient permissions")]
    InsufficientPermissions,
    
    #[msg("Admin already exists")]
    AdminAlreadyExists,
    
    #[msg("Admin not found")]
    AdminNotFound,
    
    #[msg("Admin is not active")]
    AdminNotActive,
    
    // Election errors
    #[msg("Election not found")]
    ElectionNotFound,
    
    #[msg("Election is not active")]
    ElectionNotActive,
    
    #[msg("Election is already active")]
    ElectionAlreadyActive,
    
    #[msg("Election has ended")]
    ElectionEnded,
    
    #[msg("Election is cancelled")]
    ElectionCancelled,
    
    #[msg("Election is finalized")]
    ElectionFinalized,
    
    #[msg("Cannot modify active election")]
    CannotModifyActiveElection,
    
    #[msg("Invalid time range")]
    InvalidTimeRange,
    
    // Candidate errors
    #[msg("Candidate not found")]
    CandidateNotFound,
    
    #[msg("Candidate limit reached")]
    CandidateLimitReached,
    
    // Voter errors
    #[msg("Voter not registered")]
    VoterNotRegistered,
    
    #[msg("Voter already registered")]
    VoterAlreadyRegistered,
    
    #[msg("Registration pending")]
    RegistrationPending,
    
    #[msg("Registration rejected")]
    RegistrationRejected,
    
    #[msg("Registration revoked")]
    RegistrationRevoked,
    
    // Voting errors
    #[msg("Already voted")]
    AlreadyVoted,
    
    #[msg("Invalid candidate")]
    InvalidCandidate,
    
    // Validation errors
    #[msg("Title too long")]
    TitleTooLong,
    
    #[msg("Description too long")]
    DescriptionTooLong,
    
    #[msg("Name too long")]
    NameTooLong,
    
    #[msg("Image URL too long")]
    ImageUrlTooLong,
    
    #[msg("Invalid input")]
    InvalidInput,
}