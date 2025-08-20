export type Investor = {
  userId: string;
  email: string | null | undefined;
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  amount: string;
  tier: string | null;
  maxInvestmentAmount: string | undefined;
  investmentStatus: string;
  createdAt: Date;
};

export type Supporter = {
  userId: string;
  email: string | null | undefined;
  firstName: string | null | undefined;
  lastName: string | null | undefined;
};
