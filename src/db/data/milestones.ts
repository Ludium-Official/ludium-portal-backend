import type { NewMilestone } from '@/db/schemas/milestones';

// Function to create milestones for applications
export function createMilestones(applicationIds: string[]): NewMilestone[] {
  const milestones: NewMilestone[] = [];

  // Create milestones for each application
  for (const applicationId of applicationIds) {
    // First milestone - Planning phase
    milestones.push({
      applicationId,
      title: 'Planning and Requirements',
      description: 'Define project requirements, create detailed plan and architecture',
      price: '2',
      currency: 'ETH',
      status: 'pending',
      links: [
        { url: 'https://example.com/docs', title: 'Documentation' },
        { url: 'https://example.com/plan', title: 'Project Plan' },
      ],
    });

    // Second milestone - Development
    milestones.push({
      applicationId,
      title: 'Development',
      description: 'Implementation of core functionality based on approved plans',
      price: '5',
      currency: 'ETH',
      status: 'pending',
      links: [
        { url: 'https://github.com/example/repo', title: 'Source Code' },
        { url: 'https://example.com/docs/api', title: 'API Documentation' },
      ],
    });

    // Third milestone - Testing & Delivery
    milestones.push({
      applicationId,
      title: 'Testing and Delivery',
      description: 'Final testing, bug fixes, and project delivery',
      price: '3',
      currency: 'ETH',
      status: 'pending',
      links: [
        { url: 'https://example.com/demo', title: 'Demo' },
        { url: 'https://example.com/test-report', title: 'Test Report' },
      ],
    });
  }

  return milestones;
}
