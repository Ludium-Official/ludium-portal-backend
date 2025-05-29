import type { NewPost } from '@/db/schemas';

export const posts: Omit<NewPost, 'authorId'>[] = [
  {
    title: 'Introduction to Web3 Development',
    content:
      'Web3 development is the future of the internet. In this post, we will explore the basics of Web3 development and how to get started.',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=600&fit=crop',
    summary: 'Web3 development is the future of the internet.',
  },
  {
    title: 'Understanding Smart Contracts',
    content:
      'Smart contracts are self-executing contracts with the terms directly written into code. This post explains how they work and their importance in blockchain technology.',
    image: 'https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=800&h=600&fit=crop',
    summary:
      'Smart contracts are self-executing contracts with the terms directly written into code.',
  },
  {
    title: 'DeFi Revolution: Changing Finance',
    content:
      'Decentralized Finance (DeFi) is revolutionizing the financial industry. Learn about the key DeFi protocols and how they are disrupting traditional finance.',
    image: 'https://images.unsplash.com/photo-1709884735626-63e92727d8b6?w=800&h=600&fit=crop',
    summary: 'Decentralized Finance (DeFi) is revolutionizing the financial industry.',
  },
  {
    title: 'NFT Art: A New Era for Creators',
    content:
      'Non-fungible tokens (NFTs) are transforming how artists create and sell their work. This post explores the NFT art marketplace and opportunities for creators.',
    image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&h=600&fit=crop',
    summary: 'Non-fungible tokens (NFTs) are transforming how artists create and sell their work.',
  },
  {
    title: 'Blockchain Education: Learning Resources',
    content:
      'Looking to learn about blockchain? This post compiles the best resources for beginners and advanced learners to understand blockchain technology.',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop',
    summary:
      'Looking to learn about blockchain? This post compiles the best resources for beginners and advanced learners to understand blockchain technology.',
  },
];

// Post to keywords mapping
export const postKeywords = [
  // Introduction to Web3 Development
  { postIndex: 0, keywords: ['web3', 'blockchain', 'development'] },
  // Understanding Smart Contracts
  { postIndex: 1, keywords: ['solidity', 'smart contract', 'ethereum'] },
  // DeFi Revolution: Changing Finance
  { postIndex: 2, keywords: ['defi', 'finance', 'blockchain'] },
  // NFT Art: A New Era for Creators
  { postIndex: 3, keywords: ['nft', 'art', 'marketplace'] },
  // Blockchain Education: Learning Resources
  { postIndex: 4, keywords: ['education', 'blockchain', 'learning'] },
];
