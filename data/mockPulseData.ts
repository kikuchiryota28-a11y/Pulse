import type { Post, Profile } from '@/types/pulse';

/**
 * PULSE demo data is intentionally people-first.
 * Every post is something a person noticed, tried, saved, or wanted to show another person.
 */
export const profiles: Record<string, Profile> = {
  mira: { id: 'profile-mira', username: 'mira.k', display_name: 'Mira K.', bio: 'Always taking the long way home.', avatar_url: 'https://i.pravatar.cc/160?img=47' },
  ren: { id: 'profile-ren', username: 'ren.walks', display_name: 'Ren', bio: 'Tiny city finds + good coffee.', avatar_url: 'https://i.pravatar.cc/160?img=12' },
  sora: { id: 'profile-sora', username: 'sora.notes', display_name: 'Sora', bio: 'Things I notice when everyone else is rushing.', avatar_url: 'https://i.pravatar.cc/160?img=32' },
  kai: { id: 'profile-kai', username: 'kai.curiosity', display_name: 'Kai', bio: 'Questions, weird facts, and places worth a detour.', avatar_url: 'https://i.pravatar.cc/160?img=56' },
};

export const mockPulseData: Post[] = [
  {
    id: 'post-midnight-vending-machine', author_id: profiles.mira.id, author: profiles.mira,
    title: 'I found a vending machine that sells hot corn soup at 1am.',
    description: 'I was walking home after missing the last train connection and saw this tiny machine glowing outside a laundromat. The soup was surprisingly good. I would never have found it on purpose.',
    context: 'Tokyo · found on the walk home', visibility: 'public',
    media: [{ id: 'media-midnight-vending', post_id: 'post-midnight-vending-machine', type: 'image', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1600&q=88', width: 1600, height: 1067, alt: 'A small illuminated street scene at night' }],
    created_at: '2026-09-13T09:20:00.000Z',
  },
  {
    id: 'post-hidden-bookstore', author_id: profiles.ren.id, author: profiles.ren,
    title: 'This tiny bookstore is hidden behind a normal-looking door.',
    description: 'I noticed a handwritten “open” sign on a side street and followed it upstairs. There are maybe 300 books, one chair, and a cat that completely ignores customers. Somehow it is my favorite place this week.',
    context: 'Koenji · 3 minutes from the main street', visibility: 'public',
    media: [{ id: 'media-hidden-bookstore', post_id: 'post-hidden-bookstore', type: 'image', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=88', width: 1600, height: 1067, alt: 'Shelves of books inside a cozy bookstore' }],
    created_at: '2026-09-12T13:10:00.000Z',
  },
  {
    id: 'post-rain-window', author_id: profiles.sora.id, author: profiles.sora,
    title: 'Rain made my usual train station look completely different.',
    description: 'I was waiting for the train and noticed the lights reflected on the wet floor. Everyone was staring at their phones, so I took a photo. Now I kind of want to walk around the station instead of going straight home.',
    context: 'Shinjuku · 18:42', visibility: 'public',
    media: [{ id: 'media-rain-window', post_id: 'post-rain-window', type: 'image', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1600&q=88', width: 1600, height: 1067, alt: 'Rain falling over a city street with reflections' }],
    created_at: '2026-09-11T10:42:00.000Z',
  },
  {
    id: 'post-strange-sky', author_id: profiles.kai.id, author: profiles.kai,
    title: 'I looked up for once and found this weird cloud shape.',
    description: 'Nothing scientific or spectacular — I was just waiting for a friend and happened to look up. Ten seconds later the shape was gone. Posting it because it reminded me how much interesting stuff disappears when I only look at my screen.',
    context: 'Yokohama · waiting for a friend', visibility: 'public',
    media: [{ id: 'media-strange-sky', post_id: 'post-strange-sky', type: 'image', url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1600&q=88', width: 1600, height: 1067, alt: 'Unusual cloud formations in a blue sky' }],
    created_at: '2026-09-10T07:30:00.000Z',
  },
];

export const discoveryPaths = mockPulseData.slice(1, 4);
