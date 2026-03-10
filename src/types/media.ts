export type MediaKind = 'photo' | 'video' | 'gif' | 'livePhoto';

export interface MediaAssetRef {
  id: string;
  kind: MediaKind;
  uri: string;
  width: number;
  height: number;
  durationMs?: number;
  localIdentifier?: string;
  pairedVideoUri?: string;
  createdAt: string;
}

export interface ExportPreset {
  id: 'ultra' | 'high' | 'medium' | 'share';
  maxDimension: number;
  jpegQuality: number;
  videoBitrate: number;
}
