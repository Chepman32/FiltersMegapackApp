export type FilterCategoryId =
  | 'cinematic'
  | 'vintage'
  | 'film'
  | 'bw'
  | 'neon'
  | 'glitch'
  | 'dream'
  | 'analog'
  | 'hdr'
  | 'colorshift'
  | 'texture'
  | 'motion';

export type FilterOperationType =
  | 'exposure'
  | 'contrast'
  | 'saturation'
  | 'vibrance'
  | 'temperature'
  | 'tint'
  | 'vignette'
  | 'grain'
  | 'sharpen'
  | 'blur'
  | 'hue'
  | 'highlights'
  | 'shadows'
  | 'bloom'
  | 'monochrome'
  | 'edge'
  | 'posterize'
  | 'pixelate'
  | 'zoomBlur'
  | 'halftone'
  | 'twirl'
  | 'vortex'
  | 'kaleidoscope'
  | 'crystallize'
  | 'comic'
  | 'noir'
  | 'thermal'
  | 'xray'
  | 'chromaShift'
  | 'lightLeak';

export interface FilterParameter {
  id: string;
  labelKey: string;
  min: number;
  max: number;
  defaultValue: number;
  step: number;
}

export interface FilterOperation {
  type: FilterOperationType;
  amount: number;
  secondaryAmount?: number;
}

export interface FilterDefinition {
  id: string;
  name: string;
  categoryId: FilterCategoryId;
  indexInCategory: number;
  operations: FilterOperation[];
  parameters: FilterParameter[];
}

export interface FilterCategory {
  id: FilterCategoryId;
  titleKey: string;
  subtitleKey: string;
  color: string;
}

export interface FilterStack {
  filterId: string;
  intensity: number;
  parameterValues: Record<string, number>;
}

export interface Recipe {
  id: string;
  name: string;
  filterStack: FilterStack;
  createdAt: string;
}
