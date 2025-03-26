import type { NewLink } from '@/db/schemas';

export const links: NewLink[] = [
  {
    url: 'https://example.com/grant1',
    title: 'Detailed Information',
  },
  {
    url: 'https://github.com/example/grant1',
    title: 'GitHub Repository',
  },
  {
    url: 'https://example.com/challenge1',
    title: 'Contest Rules',
  },
  {
    url: 'https://example.com/defi-program',
    title: 'About the Program',
  },
  {
    url: 'https://docs.example.com/defi-program',
    title: 'Documentation',
  },
  {
    url: 'https://example.com/nft-project',
    title: 'Project Description',
  },
  {
    url: 'https://example.com/edu-platform',
    title: 'Platform Concept',
  },
  {
    url: 'https://github.com/example/edu-platform',
    title: 'GitHub Repository',
  },
];

// Mapping of program indices to their link indices
export const programLinks = [
  // Web3 Development Grant
  { programIndex: 0, linkIndices: [0, 1] },
  // Solidity Smart Contract Challenge
  { programIndex: 1, linkIndices: [2] },
  // DeFi Innovation Program
  { programIndex: 2, linkIndices: [3, 4] },
  // NFT Art Marketplace Development
  { programIndex: 3, linkIndices: [5] },
  // Blockchain Education Platform
  { programIndex: 4, linkIndices: [6, 7] },
];
