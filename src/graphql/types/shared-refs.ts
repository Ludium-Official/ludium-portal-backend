// Shared object references to avoid circular dependencies
import type { Application as DbApplication, Investment as DbInvestment } from '@/db/schemas';
import builder from '@/graphql/builder';

// Create object references that can be used by both types
export const ApplicationRef = builder.objectRef<DbApplication>('Application');
export const InvestmentRef = builder.objectRef<DbInvestment>('Investment');
