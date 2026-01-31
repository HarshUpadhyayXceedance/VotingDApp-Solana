/**
 * Election Status Enum
 */
export enum ElectionStatus {
  Draft = 'Draft',
  Active = 'Active',
  Ended = 'Ended',
  Cancelled = 'Cancelled',
  Finalized = 'Finalized',
}

/**
 * Voter Registration Type Enum
 */
export enum VoterRegistrationType {
  Open = 'Open',
  Whitelist = 'Whitelist',
}

/**
 * Registration Status Enum
 */
export enum RegistrationStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Revoked = 'Revoked',
}

/**
 * Admin Permissions Interface
 */
export interface AdminPermissions {
  canManageElections: boolean;
  canManageCandidates: boolean;
  canManageVoters: boolean;
  canFinalizeResults: boolean;
}

/**
 * Parse election status from blockchain data
 */
export function parseElectionStatus(status: any): ElectionStatus {
  if (status.draft !== undefined) return ElectionStatus.Draft;
  if (status.active !== undefined) return ElectionStatus.Active;
  if (status.ended !== undefined) return ElectionStatus.Ended;
  if (status.cancelled !== undefined) return ElectionStatus.Cancelled;
  if (status.finalized !== undefined) return ElectionStatus.Finalized;
  return ElectionStatus.Draft;
}

/**
 * Parse voter registration type from blockchain data
 */
export function parseVoterRegistrationType(regType: any): VoterRegistrationType {
  if (regType.open !== undefined) return VoterRegistrationType.Open;
  if (regType.whitelist !== undefined) return VoterRegistrationType.Whitelist;
  return VoterRegistrationType.Open;
}

/**
 * Parse registration status from blockchain data
 */
export function parseRegistrationStatus(status: any): RegistrationStatus {
  if (status.pending !== undefined) return RegistrationStatus.Pending;
  if (status.approved !== undefined) return RegistrationStatus.Approved;
  if (status.rejected !== undefined) return RegistrationStatus.Rejected;
  if (status.revoked !== undefined) return RegistrationStatus.Revoked;
  return RegistrationStatus.Pending;
}

/**
 * Convert ElectionStatus to backend format
 */
export function toBackendElectionStatus(status: ElectionStatus): any {
  switch (status) {
    case ElectionStatus.Draft:
      return { draft: {} };
    case ElectionStatus.Active:
      return { active: {} };
    case ElectionStatus.Ended:
      return { ended: {} };
    case ElectionStatus.Cancelled:
      return { cancelled: {} };
    case ElectionStatus.Finalized:
      return { finalized: {} };
    default:
      return { draft: {} };
  }
}

/**
 * Convert VoterRegistrationType to backend format
 */
export function toBackendVoterRegistrationType(type: VoterRegistrationType): any {
  switch (type) {
    case VoterRegistrationType.Open:
      return { open: {} };
    case VoterRegistrationType.Whitelist:
      return { whitelist: {} };
    default:
      return { open: {} };
  }
}