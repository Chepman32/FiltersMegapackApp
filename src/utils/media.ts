import type { Asset } from 'react-native-image-picker';
import type { MediaAssetRef, MediaKind } from '../types/media';
import { createId } from './id';

export function detectKindFromAsset(asset: Asset): MediaKind {
  if (asset.type?.includes('gif')) {
    return 'gif';
  }
  if (asset.type?.startsWith('video')) {
    return 'video';
  }
  return 'photo';
}

export function mapPickerAsset(asset?: Asset | null): MediaAssetRef | null {
  if (!asset || !asset.uri) {
    return null;
  }
  const kind = detectKindFromAsset(asset);
  return {
    id: createId('asset'),
    kind,
    uri: asset.uri,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    durationMs: asset.duration ? Math.round(asset.duration * 1000) : undefined,
    createdAt: new Date().toISOString(),
  };
}
