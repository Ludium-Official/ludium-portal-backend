import type { NewApplication } from '@/db/schemas/applications';

// Function to create applications for programs
export function createApplications(programIds: string[], userIds: string[]): NewApplication[] {
  const applications: NewApplication[] = [];

  // Applications from first builder (userIds[3])
  applications.push({
    programId: programIds[0], // Web3 Development Grant
    applicantId: userIds[3], // Builder
    status: 'pending',
    content:
      'I would like to participate in this program as I have experience in Web3 application development and want to create a new project in this area.',
    metadata: { skills: ['javascript', 'solidity', 'react'] },
  });

  applications.push({
    programId: programIds[1], // Solidity Smart Contract Challenge
    applicantId: userIds[3], // Builder
    status: 'approved',
    content:
      'I have experience in developing smart contracts with Solidity and would like to participate in this competition.',
    metadata: { skills: ['solidity', 'ethereum', 'security'] },
  });

  // Applications from Multi-Role user (userIds[4])
  applications.push({
    programId: programIds[0], // Web3 Development Grant
    applicantId: userIds[4], // Multi-Role
    status: 'rejected',
    content:
      'I am developing a Web3 application for decentralized data exchange and would like to get funding for its development.',
    metadata: { skills: ['typescript', 'solidity', 'web3.js'] },
  });

  applications.push({
    programId: programIds[3], // NFT Art Marketplace Development
    applicantId: userIds[4], // Multi-Role
    status: 'pending',
    content:
      'I have experience in developing NFT marketplaces and would like to participate in this project.',
    metadata: { skills: ['react', 'node.js', 'nft'] },
  });

  return applications;
}
