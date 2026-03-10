import { useEffect } from 'react';
import type { MediaAssetRef } from '../types/media';
import type { FilterStack } from '../types/filter';
import { FilterEngine, buildRenderOptions } from '../native/FilterEngine';

interface UseRenderPreviewParams {
  asset: MediaAssetRef | null;
  stack: FilterStack;
  enabled?: boolean;
  onPreviewReady: (uri: string) => void;
}

export function useRenderPreview({
  asset,
  stack,
  enabled = true,
  onPreviewReady,
}: UseRenderPreviewParams): void {
  useEffect(() => {
    if (!asset || !enabled) {
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const result = await FilterEngine.renderPreview(
          asset.uri,
          buildRenderOptions(stack, asset.kind),
        );
        if (!cancelled) {
          onPreviewReady(result.uri);
        }
      } catch (error) {
        console.warn('Failed to render preview:', error);
        if (!cancelled) {
          onPreviewReady(asset.uri);
        }
      }
    }, 80);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [asset, enabled, onPreviewReady, stack]);
}

