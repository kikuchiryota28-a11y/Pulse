import CollectionShelf from '@/components/collections/CollectionShelf';
import { mockPulseData } from '@/data/mockPulseData';
import type { Collection } from '@/types/pulse';

export default function CollectionsPage() {
  const collections: Collection[] = [
    { id: 'subterranean-cities', owner_id: 'local', name: 'Subterranean Cities', description: 'Places hidden below the ordinary surface.', visibility: 'private' },
    { id: 'brutalist-architecture', owner_id: 'local', name: 'Brutalist Architecture', description: 'Structures where material, mass, and atmosphere do the talking.', visibility: 'private' },
  ];
  return <CollectionShelf collections={collections} savedPosts={mockPulseData.slice(1, 4)} />;
}
