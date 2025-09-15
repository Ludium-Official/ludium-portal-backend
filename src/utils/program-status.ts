import type { Program } from '@/db/schemas';

/**
 * PRD-compliant program status calculation
 * Returns the actual status based on dates and program type
 */
export type DetailedProgramStatus = {
  // PRD-defined statuses for funding programs
  displayStatus:
    | 'Ready' // Before applications start
    | 'Application ongoing' // Accepting Project applications
    | 'Application closed' // Applications closed but Funding hasn't started
    | 'Funding ongoing' // Investment period
    | 'Project ongoing' // Projects are in progress
    | 'Program completed' // Last milestone deadline passed
    | 'Program failed' // Program failed
    // Regular program statuses (existing)
    | 'pending'
    | 'payment_required'
    | 'rejected'
    | 'published'
    | 'closed'
    | 'completed'
    | 'cancelled';

  // Period flags
  isInApplicationPeriod: boolean;
  isInFundingPeriod: boolean;
  isInPendingPeriod: boolean;

  // Date overlap info
  hasDateOverlap: boolean;
  overlapDuration?: number;

  // Time info
  timeUntilNextPhase?: number;
  currentPhase: string;
};

export function getProgramDetailedStatus(program: Program): DetailedProgramStatus {
  const now = new Date();

  // For regular (non-funding) programs, use existing status
  if (program.type !== 'funding') {
    return {
      displayStatus: program.status || 'pending',
      isInApplicationPeriod: false,
      isInFundingPeriod: false,
      isInPendingPeriod: false,
      hasDateOverlap: false,
      currentPhase: program.status || 'pending',
    };
  }

  // For funding programs, calculate status based on dates
  const applicationStart = program.applicationStartDate
    ? new Date(program.applicationStartDate)
    : null;
  const applicationEnd = program.applicationEndDate ? new Date(program.applicationEndDate) : null;
  const fundingStart = program.fundingStartDate ? new Date(program.fundingStartDate) : null;
  const fundingEnd = program.fundingEndDate ? new Date(program.fundingEndDate) : null;

  // Check if dates are set
  if (!applicationStart || !applicationEnd || !fundingStart || !fundingEnd) {
    return {
      displayStatus: program.status || 'pending',
      isInApplicationPeriod: false,
      isInFundingPeriod: false,
      isInPendingPeriod: false,
      hasDateOverlap: false,
      currentPhase: 'Dates not configured',
    };
  }

  // Calculate period flags
  const isInApplicationPeriod = now >= applicationStart && now <= applicationEnd;
  const isInFundingPeriod = now >= fundingStart && now <= fundingEnd;
  const isInPendingPeriod =
    now > fundingEnd && now <= new Date(fundingEnd.getTime() + 24 * 60 * 60 * 1000); // 1 day after funding ends

  // Check for date overlap
  const hasDateOverlap = fundingStart < applicationEnd;
  const overlapDuration = hasDateOverlap
    ? Math.max(0, Math.min(applicationEnd.getTime(), fundingEnd.getTime()) - fundingStart.getTime())
    : 0;

  // Determine display status based on PRD requirements
  let displayStatus: DetailedProgramStatus['displayStatus'];
  let timeUntilNextPhase: number | undefined;
  let currentPhase: string;

  // Handle manual status overrides
  if (program.status === 'cancelled' || program.status === 'rejected') {
    displayStatus = program.status;
    currentPhase = program.status;
  }
  // Calculate based on dates
  else if (now < applicationStart) {
    displayStatus = 'Ready';
    currentPhase = 'Before application period';
    timeUntilNextPhase = applicationStart.getTime() - now.getTime();
  } else if (isInApplicationPeriod && !isInFundingPeriod) {
    displayStatus = 'Application ongoing';
    currentPhase = 'Application period';
    timeUntilNextPhase = applicationEnd.getTime() - now.getTime();
  } else if (now > applicationEnd && now < fundingStart) {
    displayStatus = 'Application closed';
    currentPhase = 'Between application and funding';
    timeUntilNextPhase = fundingStart.getTime() - now.getTime();
  } else if (isInFundingPeriod) {
    // PRD: When dates overlap, funding takes priority
    displayStatus = 'Funding ongoing';
    currentPhase = 'Funding period';
    timeUntilNextPhase = fundingEnd.getTime() - now.getTime();
  } else if (isInPendingPeriod) {
    // 1-day pending period for fee claiming
    displayStatus = 'published'; // Keep as published during pending
    currentPhase = 'Pending period (fee claim)';
    timeUntilNextPhase = fundingEnd.getTime() + 24 * 60 * 60 * 1000 - now.getTime();
  } else if (now > fundingEnd) {
    // Check if projects are still ongoing or completed
    // This would require checking milestone deadlines
    // For now, use the existing status
    if (program.status === 'completed') {
      displayStatus = 'Program completed';
      currentPhase = 'Completed';
    } else {
      displayStatus = 'Project ongoing';
      currentPhase = 'Projects in progress';
    }
  } else {
    displayStatus = program.status || 'pending';
    currentPhase = 'Unknown phase';
  }

  return {
    displayStatus,
    isInApplicationPeriod,
    isInFundingPeriod,
    isInPendingPeriod,
    hasDateOverlap,
    overlapDuration,
    timeUntilNextPhase,
    currentPhase,
  };
}

/**
 * Check if applications can be submitted
 */
export function canSubmitApplication(program: Program): boolean {
  if (program.type !== 'funding') return false;
  if (program.status === 'cancelled' || program.status === 'rejected') return false;

  const status = getProgramDetailedStatus(program);
  return status.isInApplicationPeriod;
}

/**
 * Check if investments can be made
 */
export function canInvest(program: Program): boolean {
  if (program.type !== 'funding') return false;
  if (program.status === 'cancelled' || program.status === 'rejected') return false;

  const status = getProgramDetailedStatus(program);
  return status.isInFundingPeriod;
}

/**
 * Check if program is in pending period for fee claiming
 */
export function canClaimFee(program: Program): boolean {
  if (program.type !== 'funding') return false;

  const status = getProgramDetailedStatus(program);
  return status.isInPendingPeriod;
}

/**
 * Format time duration for display
 */
export function formatTimeUntilNextPhase(milliseconds?: number): string {
  if (!milliseconds || milliseconds <= 0) return 'Started';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}
