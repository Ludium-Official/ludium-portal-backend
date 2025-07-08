import type { NewMilestone } from '@/db/schemas/milestones';
import { createApplications } from './applications';

// Function to create milestones for applications
export function createMilestones(
  programs: Array<{ id: string } | string>,
  userIds: string[],
): NewMilestone[] {
  const milestones: NewMilestone[] = [];

  // First, get applications since milestones are linked to applications, not programs
  const applications = createApplications(programs, userIds);

  // Create 3 milestones for each application
  for (const application of applications) {
    // First milestone - Planning phase
    milestones.push({
      applicationId: application.id,
      title: 'Planning and Requirements',
      description: 'Define project requirements, create detailed plan and architecture',
      price: '2',
      currency: 'ETH',
      status: 'pending',
      sortOrder: 1,
      links: [
        { url: 'https://example.com/docs', title: 'Documentation' },
        { url: 'https://example.com/plan', title: 'Project Plan' },
      ],
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    });

    // Second milestone - Development
    milestones.push({
      applicationId: application.id,
      title: 'Development',
      description: 'Implementation of core functionality based on approved plans',
      price: '5',
      currency: 'ETH',
      status: 'pending',
      sortOrder: 2,
      links: [
        { url: 'https://github.com/example/repo', title: 'Source Code' },
        { url: 'https://example.com/docs/api', title: 'API Documentation' },
      ],
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    });

    // Third milestone - Testing & Delivery
    milestones.push({
      applicationId: application.id,
      title: 'Testing and Delivery',
      description: 'Final testing, bug fixes, and project delivery',
      price: '3',
      currency: 'ETH',
      status: 'pending',
      sortOrder: 3,
      links: [
        { url: 'https://example.com/demo', title: 'Demo' },
        { url: 'https://example.com/test-report', title: 'Test Report' },
      ],
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    });
  }

  return milestones;
}
