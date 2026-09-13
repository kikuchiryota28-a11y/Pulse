import type { Post, Profile } from '@/types/pulse';

const profiles: Record<string, Profile> = {
  ocean: { id: 'profile-ocean', username: 'mira.k', display_name: 'Mira K.', bio: 'Documenting the places where science still has questions.', avatar_url: 'https://i.pravatar.cc/160?img=47' },
  architecture: { id: 'profile-architecture', username: 'noah.form', display_name: 'Noah Form', bio: 'Cities, concrete, and the spaces between them.', avatar_url: 'https://i.pravatar.cc/160?img=12' },
  earth: { id: 'profile-earth', username: 'fieldnotes', display_name: 'Field Notes', bio: 'Small observations from unusual places.', avatar_url: 'https://i.pravatar.cc/160?img=32' },
  science: { id: 'profile-science', username: 'lena.rao', display_name: 'Lena Rao', bio: 'Rare phenomena, explained without killing the mystery.', avatar_url: 'https://i.pravatar.cc/160?img=56' },
};

export const mockPulseData: Post[] = [
  {
    id: 'post-deep-sea', author_id: profiles.ocean.id, author: profiles.ocean,
    title: 'Find a hidden detail in your town and leave the next clue.',
    description: 'A Pulse is not finished when you notice it. It becomes yours when you act, document what happened, and hand the next move to someone else.',
    context: 'Anywhere · designed for a real-world walk', visibility: 'public', pulse_status: 'active', pulse_number: 1,
    action: 'Find one detail most people walk past. Leave a clue that helps the next person discover it without giving away the answer.', handoff_from: profiles.lena ?? profiles.ocean, handoff_count: 12,
    media: [{ id: 'media-deep-sea', post_id: 'post-deep-sea', type: 'image', url: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'Deep blue ocean surface viewed from below' }],
  },
  {
    id: 'post-brutalist', author_id: profiles.architecture.id, author: profiles.architecture,
    title: 'Take a different route home. Leave one strange thing for the next person to find.',
    description: 'Turn an ordinary journey into a small shared experiment. The route matters less than what you notice along it.',
    context: 'Tbilisi · or your own neighborhood', visibility: 'public', pulse_status: 'active', pulse_number: 2,
    action: 'Choose a route you have never taken. Photograph one unexpected detail and write a clue for the next explorer.', handoff_from: profiles.architecture, handoff_count: 7,
    media: [{ id: 'media-brutalist', post_id: 'post-brutalist', type: 'image', url: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'Monumental concrete architecture under an open sky' }],
  },
  {
    id: 'post-subterranean', author_id: profiles.earth.id, author: profiles.earth,
    title: 'Ask a stranger one question you have never asked before.',
    description: 'A tiny interruption to the normal script of a day. The answer becomes the beginning of the next Pulse.',
    context: 'Public space · with consent and respect', visibility: 'public', pulse_status: 'active', pulse_number: 3,
    action: 'Ask a simple, respectful question. Share what surprised you, then write a question for the next person.', handoff_from: profiles.earth, handoff_count: 19,
    media: [{ id: 'media-subterranean', post_id: 'post-subterranean', type: 'image', url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'Rock formations and an ancient landscape' }],
  },
  {
    id: 'post-lightning', author_id: profiles.science.id, author: profiles.science,
    title: 'Make one ordinary place feel unfamiliar for five minutes.',
    description: 'Change the way you look rather than the place itself. The next person receives only your clue, not your explanation.',
    context: 'Anywhere · five minutes', visibility: 'public', pulse_status: 'active', pulse_number: 4,
    action: 'Stand somewhere familiar and look for the detail you have never consciously noticed. Leave a clue without naming it.', handoff_from: profiles.science, handoff_count: 31,
    media: [{ id: 'media-lightning', post_id: 'post-lightning', type: 'image', url: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=88', width: 1800, height: 1200, alt: 'Storm clouds illuminated at night' }],
  },
];

export const discoveryPaths = mockPulseData.slice(1, 4);
