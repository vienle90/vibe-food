import { ReactElement } from 'react';
import { Metadata } from 'next';
import { ProfileClient } from './client';

export const metadata: Metadata = {
  title: 'Profile | Vibe Food',
  description: 'Update your profile information',
};

export default function ProfilePage(): ReactElement {
  return <ProfileClient />;
}