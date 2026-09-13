import type { Post, Profile } from '@/types/pulse';

/** Human-authored demo content: each discovery belongs to a person with context. */
export const profiles: Record<string, Profile> = {
  rena: { id: 'profile-rena', username: 'rena.walks', display_name: 'Rena Sato', bio: 'Tiny details that make familiar places feel new.', avatar_url: 'https://i.pravatar.cc/160?img=47' },
  kento: { id: 'profile-kento', username: 'kento.jpg', display_name: 'Kento Mori', bio: 'Cafes, cameras, weird signs. Usually carrying a small camera.', avatar_url: 'https://i.pravatar.cc/160?img=12' },
  mei: { id: 'profile-mei', username: 'mei.notes', display_name: 'Mei Tanaka', bio: 'Saving things I would otherwise forget five minutes later.', avatar_url: 'https://i.pravatar.cc/160?img=32' },
  haru: { id: 'profile-haru', username: 'haru_after5', display_name: 'Haru Kimura', bio: 'One thing worth sending to a friend after school.', avatar_url: 'https://i.pravatar.cc/160?img=56' },
  sora: { id: 'profile-sora', username: 'sora.builds', display_name: 'Sora Ito', bio: 'Maps, old tech, and accidental design decisions.', avatar_url: 'https://i.pravatar.cc/160?img=68' },
};

export const mockPulseData: Post[] = [
  {
    id: 'post-vending-light', author_id: profiles.rena.id, author: profiles.rena,
    title: 'I found a vending machine that lights up the sidewalk like a tiny stage.',
    description: 'I noticed the light before I noticed the machine. It made the same street feel completely different for about thirty seconds.',
    context: 'Tokyo · Nakano · found on the walk home', visibility: 'public', category: 'CITY',
    media: [{ id: 'media-vending-light', post_id: 'post-vending-light', type: 'image', url: 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'A glowing vending machine on a city street at night' }],
    reaction_counts: { loved: 24, mind_blown: 8, explore: 17, learned: 3 }, comment_count: 6, save_count: 41,
    created_at: '2026-09-13T09:20:00.000Z',
  },
  {
    id: 'post-quiet-cafe', author_id: profiles.kento.id, author: profiles.kento,
    title: 'This tiny cafe plays the same record every Sunday morning.',
    description: 'I only went in because it started raining. The owner told me the record has been playing on Sundays for years. Now I kind of want to hear it again.',
    context: 'Tokyo · Koenji · Sunday morning', visibility: 'public', category: 'PEOPLE',
    media: [{ id: 'media-quiet-cafe', post_id: 'post-quiet-cafe', type: 'image', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'Warm small cafe interior' }],
    reaction_counts: { loved: 31, mind_blown: 4, explore: 22, learned: 5 }, comment_count: 11, save_count: 52,
    created_at: '2026-09-12T13:10:00.000Z',
  },
  {
    id: 'post-school-station', author_id: profiles.mei.id, author: profiles.mei,
    title: 'I started taking one random station exit instead of the usual one.',
    description: 'Today it added six minutes to my walk and I found a tiny second-hand bookshop I had never noticed. I would have missed it completely otherwise.',
    context: 'Tokyo · after school · +6 min', visibility: 'public', category: 'ROUTINE',
    media: [{ id: 'media-school-station', post_id: 'post-school-station', type: 'image', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'A city street seen from an unusual angle' }],
    reaction_counts: { loved: 18, mind_blown: 6, explore: 29, learned: 2 }, comment_count: 8, save_count: 37,
    created_at: '2026-09-11T10:42:00.000Z',
  },
  {
    id: 'post-old-sign', author_id: profiles.haru.id, author: profiles.haru,
    title: 'There is an old sign above this shop that nobody seems to have removed.',
    description: 'The new store has been here for years, but the old lettering is still sitting above it. I like imagining what used to be here.',
    context: 'Yokohama · Motomachi · spotted after 5pm', visibility: 'public', category: 'CITY',
    media: [{ id: 'media-old-sign', post_id: 'post-old-sign', type: 'image', url: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'Distinctive old lettering on an urban building' }],
    reaction_counts: { loved: 21, mind_blown: 12, explore: 25, learned: 7 }, comment_count: 9, save_count: 46,
    created_at: '2026-09-10T07:30:00.000Z',
  },
  {
    id: 'post-old-camera', author_id: profiles.sora.id, author: profiles.sora,
    title: 'Found a 2000s camera with ordinary photos still on it.',
    description: 'The photos were just lunch, a dog, and a train window. Somehow that made the old camera much more interesting.',
    context: 'Tokyo · Akihabara · second-hand electronics', visibility: 'public', category: 'PEOPLE',
    media: [{ id: 'media-old-camera', post_id: 'post-old-camera', type: 'image', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'Compact digital camera on a table' }],
    reaction_counts: { loved: 27, mind_blown: 19, explore: 14, learned: 11 }, comment_count: 14, save_count: 63,
    created_at: '2026-09-09T15:20:00.000Z',
  },
];

export const discoveryPaths = mockPulseData.slice(1, 4);
