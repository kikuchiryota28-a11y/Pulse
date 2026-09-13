import ProfileView from '@/components/profile/ProfileView';
import { mockPulseData } from '@/data/mockPulseData';
import type { Collection } from '@/types/pulse';

type Props = { params: Promise<{ username: string }> };

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const posts = mockPulseData.filter((post) => post.author?.username === username);
  const profile = posts[0]?.author ?? { id: `profile-${username}`, username, display_name: username, bio: 'Curiosity, collected.' };
  const collections: Collection[] = [];
  return <ProfileView profile={profile} posts={posts} collections={collections} />;
}
