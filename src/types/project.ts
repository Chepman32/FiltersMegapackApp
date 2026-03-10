import type { FilterStack } from './filter';
import type { MediaAssetRef } from './media';

export interface EditOperation {
  id: string;
  type:
    | 'setFilter'
    | 'setIntensity'
    | 'setParameter'
    | 'toggleFavorite'
    | 'addMedia'
    | 'removeMedia'
    | 'setCollageLayout';
  payload: Record<string, string | number | boolean | null>;
  timestamp: string;
}

export interface ProjectDocument {
  id: string;
  schemaVersion: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  coverUri?: string;
  assets: MediaAssetRef[];
  activeAssetId?: string;
  filterStack: FilterStack;
  history: EditOperation[];
  historyCursor: number;
  collageLayoutId?: string;
}
