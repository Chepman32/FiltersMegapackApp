import { NativeModules, TurboModuleRegistry, type TurboModule } from 'react-native';
import type { MediaAssetRef, MediaKind } from '../types/media';

interface MediaPipelineSpec extends TurboModule {
  importAsset(inputPath: string, kind: MediaKind): Promise<MediaAssetRef>;
  exportAsset(
    inputPath: string,
    outputKind: MediaKind,
    quality: number,
  ): Promise<{ uri: string }>;
  transcodeVideo(inputPath: string, preset: string): Promise<{ uri: string }>;
  composeLivePhoto(imagePath: string, videoPath: string): Promise<{ uri: string }>;
  encodeGif(inputPath: string, fps: number): Promise<{ uri: string }>;
}

const moduleName = 'RNMediaPipeline';
const turbo = TurboModuleRegistry.get<MediaPipelineSpec>(moduleName);
const bridge = NativeModules[moduleName] as MediaPipelineSpec | undefined;

const fallback: MediaPipelineSpec = {
  async importAsset(inputPath, kind) {
    return {
      id: inputPath,
      kind,
      uri: inputPath,
      width: 0,
      height: 0,
      createdAt: new Date().toISOString(),
    };
  },
  async exportAsset(inputPath) {
    return { uri: inputPath };
  },
  async transcodeVideo(inputPath) {
    return { uri: inputPath };
  },
  async composeLivePhoto(imagePath) {
    return { uri: imagePath };
  },
  async encodeGif(inputPath) {
    return { uri: inputPath };
  },
};

export const MediaPipeline: MediaPipelineSpec = turbo ?? bridge ?? fallback;
