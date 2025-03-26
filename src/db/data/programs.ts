import type { NewApplication, NewProgram } from '@/db/schemas';

export const programs: Omit<NewProgram, 'creatorId' | 'validatorId'>[] = [
  {
    name: 'Web3 Development Grant',
    summary: 'Grant for Web3 project developers',
    description:
      'Funding program for developers creating innovative Web3 solutions. We seek projects that solve real problems and have scaling potential.',
    price: '5',
    currency: 'ETH',
    deadline: '2023-12-31',
    status: 'published',
  },
  {
    name: 'Solidity Smart Contract Challenge',
    summary: 'Competition for the best Solidity smart contract',
    description:
      'Contest for Solidity smart contract developers. Participants must create a secure and efficient smart contract that solves one of the proposed tasks.',
    price: '2.5',
    currency: 'ETH',
    deadline: '2023-11-15',
    status: 'published',
  },
  {
    name: 'DeFi Innovation Program',
    summary: 'Program for DeFi innovations',
    description:
      'Support program for innovative projects in decentralized finance (DeFi). We seek projects offering new financial instruments, protocols, or blockchain-based services.',
    price: '10',
    currency: 'ETH',
    deadline: '2024-01-31',
    status: 'draft',
  },
  {
    name: 'NFT Art Marketplace Development',
    summary: 'Development of an NFT art marketplace',
    description:
      'Project to create an NFT art marketplace focused on supporting artists and creators. Looking for developers with NFT and frontend development experience.',
    price: '7.5',
    currency: 'ETH',
    deadline: '2023-12-15',
    status: 'published',
  },
  {
    name: 'Blockchain Education Platform',
    summary: 'Platform for blockchain technology education',
    description:
      'Project to create an educational platform for blockchain technologies. The goal is to make blockchain more accessible to a wide audience through interactive courses and practical assignments.',
    price: '15',
    currency: 'ETH',
    deadline: '2024-02-28',
    status: 'draft',
  },
];

// Keywords for programs
export const keywords = [
  'web3',
  'blockchain',
  'development',
  'solidity',
  'smart contract',
  'ethereum',
  'defi',
  'finance',
  'nft',
  'art',
  'marketplace',
  'education',
  'learning',
];

// Program to keywords mapping
export const programKeywords = [
  // Web3 Development Grant
  { programIndex: 0, keywords: ['web3', 'blockchain', 'development'] },
  // Solidity Smart Contract Challenge
  { programIndex: 1, keywords: ['solidity', 'smart contract', 'ethereum'] },
  // DeFi Innovation Program
  { programIndex: 2, keywords: ['defi', 'finance', 'blockchain'] },
  // NFT Art Marketplace Development
  { programIndex: 3, keywords: ['nft', 'art', 'marketplace'] },
  // Blockchain Education Platform
  { programIndex: 4, keywords: ['education', 'blockchain', 'learning'] },
];

// Функция для создания заявок на программы
export function createApplications(programIds: string[], userIds: string[]): NewApplication[] {
  const applications: NewApplication[] = [];

  // Заявки от первого builder (userIds[3])
  applications.push({
    programId: programIds[0], // Web3 Development Grant
    applicantId: userIds[3], // Builder
    status: 'pending',
    content:
      'Я хотел бы принять участие в этой программе, так как имею опыт разработки Web3 приложений и хочу создать новый проект в этой области.',
    metadata: { skills: ['javascript', 'solidity', 'react'] },
  });

  applications.push({
    programId: programIds[1], // Solidity Smart Contract Challenge
    applicantId: userIds[3], // Builder
    status: 'approved',
    content:
      'У меня есть опыт разработки смарт-контрактов на Solidity, и я хотел бы принять участие в этом конкурсе.',
    metadata: { skills: ['solidity', 'ethereum', 'security'] },
  });

  // Заявки от Multi-Role пользователя (userIds[4])
  applications.push({
    programId: programIds[0], // Web3 Development Grant
    applicantId: userIds[4], // Multi-Role
    status: 'rejected',
    content:
      'Я разрабатываю Web3 приложение для децентрализованного обмена данными и хотел бы получить финансирование для его развития.',
    metadata: { skills: ['typescript', 'solidity', 'web3.js'] },
  });

  applications.push({
    programId: programIds[3], // NFT Art Marketplace Development
    applicantId: userIds[4], // Multi-Role
    status: 'pending',
    content:
      'У меня есть опыт разработки NFT маркетплейсов, и я хотел бы принять участие в этом проекте.',
    metadata: { skills: ['react', 'node.js', 'nft'] },
  });

  return applications;
}
