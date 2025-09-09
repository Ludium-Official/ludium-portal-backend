export type ProgramStatsByStatusType = {
  notConfirmed: number;
  confirmed: number;
  published: number;
  paymentRequired: number;
  completed: number;
  refund: number;
};

export type InvestmentStatsByStatusType = {
  ready: number;
  applicationOngoing: number;
  fundingOngoing: number;
  projectOngoing: number;
  programCompleted: number;
  refund: number;
};
