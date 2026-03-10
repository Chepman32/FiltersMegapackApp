import { NativeModules, TurboModuleRegistry, type TurboModule } from 'react-native';

interface AIEffectsSpec extends TurboModule {
  segmentSubject(inputPath: string): Promise<{ maskUri: string }>;
  removeBackground(
    inputPath: string,
    maskPath?: string,
  ): Promise<{ outputUri: string; maskUri: string }>;
  upscaleImage(inputPath: string, scale: number): Promise<{ outputUri: string }>;
  applyMask(
    inputPath: string,
    maskPath: string,
    backgroundHex: string,
  ): Promise<{ outputUri: string }>;
}

const moduleName = 'RNAIEffects';
const turbo = TurboModuleRegistry.get<AIEffectsSpec>(moduleName);
const bridge = NativeModules[moduleName] as AIEffectsSpec | undefined;

const fallback: AIEffectsSpec = {
  async segmentSubject(inputPath) {
    return { maskUri: inputPath };
  },
  async removeBackground(inputPath) {
    return { outputUri: inputPath, maskUri: inputPath };
  },
  async upscaleImage(inputPath) {
    return { outputUri: inputPath };
  },
  async applyMask(inputPath) {
    return { outputUri: inputPath };
  },
};

export const AIEffects: AIEffectsSpec = turbo ?? bridge ?? fallback;
