import {
  NativeModules,
  Platform,
  TurboModuleRegistry,
  type TurboModule,
} from 'react-native';
import type { FilterStack } from '../types/filter';
import { resolveFilterStack } from '../filters/recipe';

export interface RenderResult {
  uri: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface FilterEngineCapabilities {
  supportsMetal: boolean;
  supportsLivePhoto: boolean;
  supportsGif: boolean;
  supportsRealtimePreview: boolean;
}

export interface FilterRenderOptions {
  kind: 'photo' | 'video' | 'gif' | 'livePhoto';
  maxDimension?: number;
  quality?: number;
  stack: FilterStack;
  operations: Array<{
    type: string;
    amount: number;
    secondaryAmount?: number;
  }>;
}

interface FilterEngineSpec extends TurboModule {
  renderPreview(inputPath: string, options: FilterRenderOptions): Promise<RenderResult>;
  renderFull(inputPath: string, options: FilterRenderOptions): Promise<RenderResult>;
  generateThumbnail(
    inputPath: string,
    options: FilterRenderOptions & { size: number },
  ): Promise<RenderResult>;
  listCapabilities(): Promise<FilterEngineCapabilities>;
}

const moduleName = 'RNFilterEngine';
const turbo = TurboModuleRegistry.get<FilterEngineSpec>(moduleName);
const bridge = NativeModules[moduleName] as FilterEngineSpec | undefined;

const fallback: FilterEngineSpec = {
  async renderPreview(inputPath) {
    return { uri: inputPath };
  },
  async renderFull(inputPath) {
    return { uri: inputPath };
  },
  async generateThumbnail(inputPath) {
    return { uri: inputPath };
  },
  async listCapabilities() {
    return {
      supportsMetal: Platform.OS === 'ios',
      supportsLivePhoto: Platform.OS === 'ios',
      supportsGif: true,
      supportsRealtimePreview: true,
    };
  },
};

export const FilterEngine: FilterEngineSpec = turbo ?? bridge ?? fallback;

export function buildRenderOptions(
  stack: FilterStack,
  kind: FilterRenderOptions['kind'],
): FilterRenderOptions {
  const filter = resolveFilterStack(stack);
  return {
    stack,
    operations: filter.operations,
    kind,
    maxDimension: kind === 'photo' ? 2560 : 1920,
    quality: 0.95,
  };
}
