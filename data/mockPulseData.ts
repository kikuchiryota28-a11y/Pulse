import type { Post, Profile } from '@/types/pulse';

const profiles: Record<string, Profile> = {
  ocean: {
    id: 'profile-ocean',
    username: 'mira.k',
    display_name: 'Mira K.',
    bio: 'Documenting the places where science still has questions.',
    avatar_url: 'https://i.pravatar.cc/160?img=47',
  },
  architecture: {
    id: 'profile-architecture',
    username: 'noah.form',
    display_name: 'Noah Form',
    bio: 'Cities, concrete, and the spaces between them.',
    avatar_url: 'https://i.pravatar.cc/160?img=12',
  },
  earth: {
    id: 'profile-earth',
    username: 'fieldnotes',
    display_name: 'Field Notes',
    bio: 'Small observations from unusual places.',
    avatar_url: 'https://i.pravatar.cc/160?img=32',
  },
  science: {
    id: 'profile-science',
    username: 'lena.rao',
    display_name: 'Lena Rao',
    bio: 'Rare phenomena, explained without killing the mystery.',
    avatar_url: 'https://i.pravatar.cc/160?img=56',
  },
};

export const mockPulseData: Post[] = [
  {
    id: 'post-deep-sea',
    author_id: profiles.ocean.id,
    author: profiles.ocean,
    title: 'Something is moving beneath the deepest mapped canyon.',
    description: 'A sequence of low-frequency signals appeared during a remote-ocean survey. The pattern repeats, but its source remains unresolved.',
    context: 'Pacific Ocean · 4,180 m below the surface',
    visibility: 'public',
    media: [{ id: 'media-deep-sea', post_id: 'post-deep-sea', type: 'image', url: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'Deep blue ocean surface viewed from below' }],
  },
  {
    id: 'post-brutalist',
    author_id: profiles.architecture.id,
    author: profiles.architecture,
    title: 'Why does this abandoned building feel unfinished on purpose?',
    description: 'A concrete structure outside Tbilisi has no obvious entrance from the street. Its strange geometry was designed around light rather than circulation.',
    context: 'Tbilisi, Georgia · 1970s civic architecture',
    visibility: 'public',
    media: [{ id: 'media-brutalist', post_id: 'post-brutalist', type: 'image', url: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'Monumental concrete architecture under an open sky' }],
  },
  {
    id: 'post-subterranean',
    author_id: profiles.earth.id,
    author: profiles.earth,
    title: 'There is a city underneath this ordinary-looking landscape.',
    description: 'Hundreds of rooms, ventilation shafts, kitchens and gathering spaces were carved beneath the ground over centuries. Some passages still have no mapped endpoint.',
    context: 'Cappadocia, Türkiye · underground settlement',
    visibility: 'public',
    media: [{ id: 'media-subterranean', post_id: 'post-subterranean', type: 'image', url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'Rock formations and an ancient landscape' }],
  },
  {
    id: 'post-lightning',
    author_id: profiles.science.id,
    author: profiles.science,
    title: 'For a fraction of a second, the sky turns into a giant laboratory.',
    description: 'Sprites are enormous electrical discharges above thunderstorms. They are invisible from the ground unless the conditions, timing, and camera exposure are almost perfect.',
    context: 'Upper atmosphere · transient luminous events',
    visibility: 'public',
    media: [{ id: 'media-lightning', post_id: 'post-lightning', type: 'image', url: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'Storm clouds illuminated at night' }],
  },
];

export const discoveryPaths = mockPulseData.slice(1, 4);
