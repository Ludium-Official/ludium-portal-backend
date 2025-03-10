import type { NewFile } from '@/db/schemas/files';

export const files: Omit<NewFile, 'uploadedById'>[] = [
  {
    fileName: 'profile-image-1.jpg',
    originalName: 'profile.jpg',
    mimeType: 'image/jpeg',
    path: 'users/profile-image-1.jpg',
  },
  {
    fileName: 'sponsor-logo.png',
    originalName: 'logo.png',
    mimeType: 'image/png',
    path: 'organizations/sponsor-logo.png',
  },
  {
    fileName: 'validator-document.pdf',
    originalName: 'document.pdf',
    mimeType: 'application/pdf',
    path: 'documents/validator-document.pdf',
  },
  {
    fileName: 'builder-portfolio.jpg',
    originalName: 'portfolio.jpg',
    mimeType: 'image/jpeg',
    path: 'portfolios/builder-portfolio.jpg',
  },
  {
    fileName: 'multi-role-avatar.png',
    originalName: 'avatar.png',
    mimeType: 'image/png',
    path: 'avatars/multi-role-avatar.png',
  },
];
