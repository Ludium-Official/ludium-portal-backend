import type { NewApplication } from '@/db/schemas/applications';
import { v4 as uuidv4 } from 'uuid';

// Function to create applications for programs
export function createApplications(
  programs: Array<{ id: string } | string>,
  userIds: string[],
): (NewApplication & { id: string })[] {
  const applications: (NewApplication & { id: string })[] = [];

  // Get program IDs from the input (which could be strings or objects)
  const programIds = programs.map((program) =>
    typeof program === 'string' ? program : program.id,
  );

  // Applications from first builder (userIds[3])
  applications.push({
    id: uuidv4(),
    name: 'Web3 Development Grant Application',
    price: '5',
    programId: programIds[0], // Web3 Development Grant
    applicantId: userIds[3], // Builder
    status: 'pending',
    content:
      'I would like to participate in this program as I have experience in Web3 application development and want to create a new project in this field.',
    metadata: { skills: ['javascript', 'solidity', 'react'] },
  });

  applications.push({
    id: uuidv4(),
    name: 'Solidity Challenge Application',
    price: '2.5',
    programId: programIds[1], // Solidity Smart Contract Challenge
    applicantId: userIds[3], // Builder
    status: 'accepted',
    content:
      'I have experience in developing Solidity smart contracts and would like to participate in this competition.',
    metadata: { skills: ['solidity', 'ethereum', 'security'] },
  });

  // Applications from Multi-Role user (userIds[4])
  applications.push({
    id: uuidv4(),
    name: 'Web3 Grant Application',
    price: '5',
    programId: programIds[0], // Web3 Development Grant
    applicantId: userIds[4], // Multi-Role
    status: 'rejected',
    content:
      'I am developing a Web3 application for decentralized data exchange and would like to receive funding for its development.',
    metadata: { skills: ['typescript', 'solidity', 'web3.js'] },
  });

  applications.push({
    id: uuidv4(),
    name: 'NFT Marketplace Application',
    price: '7.5',
    programId: programIds[3], // NFT Art Marketplace Development
    applicantId: userIds[4], // Multi-Role
    status: 'pending',
    content:
      'I have experience in developing NFT marketplaces and would like to participate in this project.',
    metadata: { skills: ['react', 'node.js', 'nft'] },
  });

  return applications;
}
