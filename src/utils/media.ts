import type { Asset } from 'react-native-image-picker';
import type { DocumentPickerResponse } from 'react-native-document-picker';
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

function detectKindFromMimeOrName(
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
): MediaKind {
  const normalizedMime = mimeType?.toLowerCase() ?? '';
  const normalizedName = fileName?.toLowerCase() ?? '';
  if (normalizedMime.includes('gif') || normalizedName.endsWith('.gif')) {
    return 'gif';
  }
  if (
    normalizedMime.startsWith('video/') ||
    normalizedName.endsWith('.mp4') ||
    normalizedName.endsWith('.mov') ||
    normalizedName.endsWith('.m4v')
  ) {
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

export function mapDocumentAsset(
  asset?: DocumentPickerResponse | null,
): MediaAssetRef | null {
  if (!asset) {
    return null;
  }
  const uri = asset.fileCopyUri ?? asset.uri;
  if (!uri) {
    return null;
  }
  return {
    id: createId('asset'),
    kind: detectKindFromMimeOrName(asset.type, asset.name),
    uri,
    width: 0,
    height: 0,
    createdAt: new Date().toISOString(),
  };
}
