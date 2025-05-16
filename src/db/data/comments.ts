import type { NewComment } from '@/db/schemas';

export type CommentSeed = Omit<NewComment, 'authorId' | 'postId'> & {
  postIndex: number;
  authorIndex: number;
  parentIndex?: number;
};

export const comments: CommentSeed[] = [
  // Comments for Post 0: Introduction to Web3 Development
  {
    content: 'Great introduction to Web3! Do you have any recommendations for beginner courses?',
    postIndex: 0,
    authorIndex: 1,
  },
  {
    content: 'I started with the Ethereum Developer Bootcamp, highly recommend it.',
    postIndex: 0,
    authorIndex: 2,
    parentIndex: 0,
  },
  {
    content: 'Do you think Web3 will truly transform the internet, or is it just a passing trend?',
    postIndex: 0,
    authorIndex: 3,
  },
  {
    content:
      "The technology is already making a real impact on finance and digital ownership, so I think it's not just a trend.",
    postIndex: 0,
    authorIndex: 4,
    parentIndex: 2,
  },

  // Comments for Post 1: Understanding Smart Contracts
  {
    content: "I'm new to programming. How difficult is it to start writing smart contracts?",
    postIndex: 1,
    authorIndex: 4,
  },
  {
    content:
      'Basic smart contracts are relatively simple if you have programming experience. Start by learning Solidity.',
    postIndex: 1,
    authorIndex: 0,
    parentIndex: 4,
  },
  {
    content: 'What tools do you use for testing your smart contracts?',
    postIndex: 1,
    authorIndex: 3,
  },
  {
    content: 'Hardhat and Foundry are excellent tools for development and testing.',
    postIndex: 1,
    authorIndex: 1,
    parentIndex: 6,
  },

  // Comments for Post 2: DeFi Revolution: Changing Finance
  {
    content: 'DeFi solves many problems in traditional finance, but what about security concerns?',
    postIndex: 2,
    authorIndex: 2,
  },
  {
    content:
      'Security indeed remains the main concern. Audits and insurance are becoming standard practice in serious projects.',
    postIndex: 2,
    authorIndex: 0,
    parentIndex: 8,
  },
  {
    content: 'Which DeFi projects do you consider most innovative at the moment?',
    postIndex: 2,
    authorIndex: 4,
  },
  {
    content:
      "I'm following projects working on Layer 2 solutions and scaling, they're at the cutting edge right now.",
    postIndex: 2,
    authorIndex: 3,
    parentIndex: 10,
  },

  // Comments for Post 3: NFT Art: A New Era for Creators
  {
    content:
      "As an artist, I still don't understand the advantage of NFTs compared to traditional digital art sales.",
    postIndex: 3,
    authorIndex: 1,
  },
  {
    content:
      'NFTs provide you with provable ownership and the ability to earn royalties from resales, which is impossible with traditional sales.',
    postIndex: 3,
    authorIndex: 0,
    parentIndex: 12,
  },
  {
    content: 'Do you think the NFT market will recover after the recent downturn?',
    postIndex: 3,
    authorIndex: 2,
  },
  {
    content:
      'I think the market is already becoming more mature. Projects with real utility and quality artwork will thrive.',
    postIndex: 3,
    authorIndex: 4,
    parentIndex: 14,
  },

  // Comments for Post 4: Blockchain Education: Learning Resources
  {
    content:
      'Thanks for the resource collection! Which ones are best suited for complete beginners?',
    postIndex: 4,
    authorIndex: 3,
  },
  {
    content:
      "I'd recommend starting with Cryptozombies for interactive learning and Ethereum documentation for understanding the basics.",
    postIndex: 4,
    authorIndex: 1,
    parentIndex: 16,
  },
  {
    content: 'Are there any good resources for learning blockchain in other languages?',
    postIndex: 4,
    authorIndex: 0,
  },
  {
    content:
      'Many quality YouTube channels have subtitles, and Ethereum documentation is translated into multiple languages. Local meetups are also valuable.',
    postIndex: 4,
    authorIndex: 2,
    parentIndex: 18,
  },
];
