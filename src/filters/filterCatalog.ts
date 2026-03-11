import type {
  FilterCategory,
  FilterDefinition,
  FilterOperation,
  FilterOperationType,
  FilterParameter,
  StaticFilterCategoryId,
} from '../types/filter';
import { seededRange } from '../utils/seeded';

interface OperationBlueprint {
  type: FilterOperationType;
  min: number;
  max: number;
  secondaryMin?: number;
  secondaryMax?: number;
  every?: number;
}

interface CategoryTemplate {
  id: StaticFilterCategoryId;
  titleKey: string;
  subtitleKey: string;
  color: string;
  seed: number;
  names: string[];
  blueprints: OperationBlueprint[];
}

interface SpecialFilterTemplate {
  id: string;
  name: string;
  operations: FilterOperation[];
}

const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    id: 'cinematic',
    titleKey: 'categories.cinematic.title',
    subtitleKey: 'categories.cinematic.subtitle',
    color: '#ff6d5a',
    seed: 110,
    names: [
      'Golden Frame',
      'Copper Story',
      'Cold Feature',
      'Dusty Stage',
      'Wide Scope',
      'Blue Premiere',
      'Urban Cut',
      'Final Hour',
      'Night Margin',
      'Silent Tape',
      'City Drama',
      'Muted Hero',
      'Glass Scene',
      'Granite Shot',
      'Moon Theater',
      'Desert Lens',
      'Wet Asphalt',
      'Arctic Plot',
      'Signal Noir',
      'Grand Finale',
    ],
    blueprints: [
      { type: 'exposure', min: -0.22, max: 0.2 },
      { type: 'contrast', min: 0.9, max: 1.35 },
      { type: 'saturation', min: 0.65, max: 1.18 },
      { type: 'highlights', min: -0.5, max: 0.25 },
      { type: 'shadows', min: -0.1, max: 0.35 },
      { type: 'vignette', min: 0.1, max: 0.8 },
      { type: 'bloom', min: 0.0, max: 0.22, every: 2 },
    ],
  },
  {
    id: 'vintage',
    titleKey: 'categories.vintage.title',
    subtitleKey: 'categories.vintage.subtitle',
    color: '#d6a177',
    seed: 240,
    names: [
      'Sepia Sunday',
      'Paper Dust',
      'Cafe Slide',
      'Old Mint',
      'Shabby Warm',
      'Orange Reel',
      'Retro Bloom',
      'Silk Faded',
      'Porch Postcard',
      'Mocha Hour',
      'Aged Card',
      'Rust Album',
      'Soft Amber',
      'Tape Echo',
      'Plush Brown',
      'Cedar Light',
      'Archive Tone',
      'Warm Drawer',
      'Fossil Fade',
      'Memory Roll',
    ],
    blueprints: [
      { type: 'temperature', min: 4500, max: 6900, secondaryMin: 5000, secondaryMax: 6400 },
      { type: 'tint', min: -20, max: 28 },
      { type: 'saturation', min: 0.45, max: 0.95 },
      { type: 'grain', min: 0.08, max: 0.38 },
      { type: 'vignette', min: 0.12, max: 0.78 },
      { type: 'lightLeak', min: 0.08, max: 0.42, every: 2 },
      { type: 'posterize', min: 16, max: 36, every: 3 },
    ],
  },
  {
    id: 'film',
    titleKey: 'categories.film.title',
    subtitleKey: 'categories.film.subtitle',
    color: '#8f9dff',
    seed: 360,
    names: [
      'Portra Note',
      'Slide 50',
      'Eterna Soft',
      'Chrome Grain',
      'Mint 35',
      'Studio Roll',
      'Street 400',
      'Plaza Film',
      'Deep 800',
      'Cloud Scan',
      'Velvet ISO',
      'Pacific Roll',
      'Quiet Emulsion',
      'Neat Lab',
      'Crisp Stock',
      'Dust Scan',
      'Highland ISO',
      'Metro Roll',
      'Meadow Film',
      'Silver Box',
    ],
    blueprints: [
      { type: 'contrast', min: 0.82, max: 1.3 },
      { type: 'saturation', min: 0.62, max: 1.22 },
      { type: 'grain', min: 0.05, max: 0.31 },
      { type: 'highlights', min: -0.3, max: 0.2 },
      { type: 'shadows', min: -0.22, max: 0.28 },
      { type: 'halftone', min: 0.0, max: 0.28, every: 4 },
      { type: 'lightLeak', min: 0.05, max: 0.3, every: 3 },
    ],
  },
  {
    id: 'bw',
    titleKey: 'categories.bw.title',
    subtitleKey: 'categories.bw.subtitle',
    color: '#9da3a9',
    seed: 480,
    names: [
      'Soft Silver',
      'Noir Velvet',
      'Mono Steel',
      'Fog Print',
      'Shadow Press',
      'Graphite',
      'Slate Story',
      'Brutal Grain',
      'Ghost White',
      'Lunar Paper',
      'Storm Mono',
      'Night Grain',
      'Metal Plate',
      'Coal Print',
      'Studio Noir',
      'Contrast Ink',
      'Dusty Black',
      'Echo Mono',
      'Pearl Gray',
      'X Noir',
    ],
    blueprints: [
      { type: 'monochrome', min: 0.72, max: 1.0 },
      { type: 'contrast', min: 0.95, max: 1.52 },
      { type: 'grain', min: 0.03, max: 0.4 },
      { type: 'vignette', min: 0.15, max: 0.85 },
      { type: 'noir', min: 0.3, max: 0.95, every: 3 },
      { type: 'edge', min: 0.0, max: 0.24, every: 4 },
    ],
  },
  {
    id: 'neon',
    titleKey: 'categories.neon.title',
    subtitleKey: 'categories.neon.subtitle',
    color: '#ff4fd8',
    seed: 600,
    names: [
      'Neon Rush',
      'Laser Pop',
      'City Magenta',
      'Violet Signal',
      'Electric Mint',
      'Night Candy',
      'Glow Parade',
      'Cyber Bloom',
      'Pulse UV',
      'Quartz Pop',
      'Arcade Loop',
      'Hot Pixel',
      'Neon Verve',
      'Future Lamp',
      'Pink Overdrive',
      'Ice Plasma',
      'Hyper Lime',
      'Aurora Club',
      'Sonic Bloom',
      'Nova Strip',
    ],
    blueprints: [
      { type: 'saturation', min: 1.08, max: 1.72 },
      { type: 'vibrance', min: 0.22, max: 1.05 },
      { type: 'hue', min: -0.7, max: 0.9 },
      { type: 'contrast', min: 1.03, max: 1.48 },
      { type: 'bloom', min: 0.1, max: 0.5 },
      { type: 'chromaShift', min: 0.04, max: 0.45, every: 2 },
      { type: 'thermal', min: 0.0, max: 0.35, every: 5 },
    ],
  },
  {
    id: 'glitch',
    titleKey: 'categories.glitch.title',
    subtitleKey: 'categories.glitch.subtitle',
    color: '#44d4ff',
    seed: 720,
    names: [
      'Pixel Fracture',
      'Signal Tear',
      'Data Crack',
      'Chromatic Lag',
      'Phase Jump',
      'Error Burst',
      'Broken Codec',
      'Scan Fault',
      'RGB Drift',
      'Stutter Frame',
      'Ghost Driver',
      'Noise Crash',
      'Warp Skip',
      'Hard Split',
      'Dead Channel',
      'Frame Slip',
      'Static Echo',
      'Null Bloom',
      'Crash Parade',
      'Packet Shift',
    ],
    blueprints: [
      { type: 'chromaShift', min: 0.09, max: 0.62 },
      { type: 'pixelate', min: 4, max: 40 },
      { type: 'twirl', min: 0.0, max: 1.0, every: 2 },
      { type: 'edge', min: 0.03, max: 0.52 },
      { type: 'posterize', min: 6, max: 18 },
      { type: 'xray', min: 0.0, max: 0.42, every: 4 },
      { type: 'comic', min: 0.0, max: 0.35, every: 3 },
    ],
  },
  {
    id: 'dream',
    titleKey: 'categories.dream.title',
    subtitleKey: 'categories.dream.subtitle',
    color: '#9d7bff',
    seed: 840,
    names: [
      'Velvet Mist',
      'Cloud Pillow',
      'Lilac Drift',
      'Moon Float',
      'Cotton Light',
      'Spirit Fog',
      'Whisper Bloom',
      'Pastel Tide',
      'Lucid Fade',
      'Petal Blur',
      'Satin Air',
      'Halo Trail',
      'Dreamline',
      'Skylace',
      'Pink Mirage',
      'Blue Haze',
      'Sleepy Gold',
      'Night Feather',
      'Soft Orbit',
      'Quiet Aurora',
    ],
    blueprints: [
      { type: 'bloom', min: 0.16, max: 0.72 },
      { type: 'blur', min: 0.4, max: 3.3 },
      { type: 'vibrance', min: 0.02, max: 0.62 },
      { type: 'temperature', min: 5300, max: 7200, secondaryMin: 5000, secondaryMax: 6300 },
      { type: 'twirl', min: 0.0, max: 0.42, every: 3 },
      { type: 'vortex', min: 0.0, max: 0.34, every: 4 },
    ],
  },
  {
    id: 'analog',
    titleKey: 'categories.analog.title',
    subtitleKey: 'categories.analog.subtitle',
    color: '#bf8a6c',
    seed: 960,
    names: [
      'Dust Drive',
      'Cassette Fade',
      'Warm Slide',
      'Broken Lens',
      'Film Scratch',
      'Tape Heat',
      'Gate Flare',
      'Brick Tone',
      'Aged Copper',
      'Clay Print',
      'Rust Night',
      'Old Booth',
      'Vintage Leak',
      'Burnt Border',
      'Mellow Rust',
      'Retro Relay',
      'Orange Hiss',
      'Classic Wear',
      'Patina Film',
      'Old Vinyl',
    ],
    blueprints: [
      { type: 'grain', min: 0.11, max: 0.55 },
      { type: 'temperature', min: 4700, max: 6800, secondaryMin: 5100, secondaryMax: 6300 },
      { type: 'tint', min: -26, max: 21 },
      { type: 'lightLeak', min: 0.12, max: 0.68 },
      { type: 'vignette', min: 0.2, max: 0.9 },
      { type: 'crystallize', min: 0.0, max: 0.25, every: 5 },
    ],
  },
  {
    id: 'hdr',
    titleKey: 'categories.hdr.title',
    subtitleKey: 'categories.hdr.subtitle',
    color: '#6effb0',
    seed: 1080,
    names: [
      'Detail Boost',
      'Micro Clarity',
      'Deep Dynamic',
      'Cloud Lift',
      'Sharp Range',
      'Balanced Tone',
      'Peak Lights',
      'Open Shadows',
      'Street Crisp',
      'Fine Boost',
      'Texture Pop',
      'Pro Detail',
      'Smart Range',
      'Ultra Lift',
      'Crisp Layer',
      'Pulse Detail',
      'Hard Edge',
      'Clear Rain',
      'Bold HDR',
      'Max Fidelity',
    ],
    blueprints: [
      { type: 'highlights', min: -0.75, max: -0.15 },
      { type: 'shadows', min: 0.25, max: 0.78 },
      { type: 'sharpen', min: 0.15, max: 1.42 },
      { type: 'contrast', min: 1.05, max: 1.34 },
      { type: 'vibrance', min: 0.12, max: 0.5 },
      { type: 'edge', min: 0.0, max: 0.2, every: 4 },
    ],
  },
  {
    id: 'colorshift',
    titleKey: 'categories.colorshift.title',
    subtitleKey: 'categories.colorshift.subtitle',
    color: '#33ffc3',
    seed: 1200,
    names: [
      'Hue Orbit',
      'Split Prism',
      'Teal Peel',
      'Orange Slide',
      'Mint Haze',
      'Purple Fade',
      'Acid Coral',
      'Warm Cyan',
      'Dual Shift',
      'Color Gate',
      'RGB Swing',
      'Tone Spiral',
      'Midnight Mint',
      'Sunset Cyan',
      'Iris Twist',
      'Lavender Gold',
      'Signal Hue',
      'Spectrum Bend',
      'Prism Night',
      'Chroma Bloom',
    ],
    blueprints: [
      { type: 'hue', min: -1.2, max: 1.2 },
      { type: 'chromaShift', min: 0.05, max: 0.48 },
      { type: 'temperature', min: 4200, max: 7600, secondaryMin: 5000, secondaryMax: 6400 },
      { type: 'tint', min: -35, max: 35 },
      { type: 'kaleidoscope', min: 0.0, max: 0.45, every: 3 },
    ],
  },
  {
    id: 'texture',
    titleKey: 'categories.texture.title',
    subtitleKey: 'categories.texture.subtitle',
    color: '#ffb86b',
    seed: 1320,
    names: [
      'Paper Fibers',
      'Granite Wash',
      'Sandy Skin',
      'Canvas Touch',
      'Brick Grain',
      'Pixel Dust',
      'Ink Dot',
      'Print Mesh',
      'Raw Texture',
      'Rough Tone',
      'Sand Storm',
      'Poster Wall',
      'Stone Mist',
      'Concrete Halftone',
      'Photo Mesh',
      'Aqua Canvas',
      'Rust Dot',
      'Dust Storm',
      'Raw Offset',
      'Dry Film',
    ],
    blueprints: [
      { type: 'halftone', min: 0.03, max: 0.62 },
      { type: 'crystallize', min: 0.02, max: 0.37 },
      { type: 'grain', min: 0.1, max: 0.52 },
      { type: 'edge', min: 0.0, max: 0.5 },
      { type: 'lightLeak', min: 0.02, max: 0.35, every: 2 },
      { type: 'posterize', min: 8, max: 24, every: 3 },
    ],
  },
  {
    id: 'motion',
    titleKey: 'categories.motion.title',
    subtitleKey: 'categories.motion.subtitle',
    color: '#7ad7ff',
    seed: 1440,
    names: [
      'Speed Sweep',
      'Rush Ring',
      'Orbit Blur',
      'Tunnel Twist',
      'Warp Signal',
      'Velocity Pop',
      'Spin Night',
      'Motion Halo',
      'Pulse Runner',
      'Fast Bloom',
      'Spiral Echo',
      'Vector Heat',
      'Glide Track',
      'Momentum',
      'Rotary Vibe',
      'Flash Route',
      'Dynamic Loop',
      'Tachyon',
      'Quick Shift',
      'Hyper Drift',
    ],
    blueprints: [
      { type: 'zoomBlur', min: 0.0, max: 24 },
      { type: 'twirl', min: 0.0, max: 0.85 },
      { type: 'vortex', min: 0.0, max: 0.65 },
      { type: 'kaleidoscope', min: 0.0, max: 0.5, every: 2 },
      { type: 'bloom', min: 0.03, max: 0.4 },
      { type: 'comic', min: 0.0, max: 0.36, every: 4 },
    ],
  },
];

const SPECIAL_FILTERS_BY_CATEGORY: Partial<
  Record<StaticFilterCategoryId, SpecialFilterTemplate[]>
> = {
  bw: [
    {
      id: 'bw-pencil-sketch',
      name: 'Pencil Sketch',
      operations: [
        {
          type: 'pencilSketch',
          amount: 0.96,
          secondaryAmount: 0.78,
        },
      ],
    },
  ],
  texture: [
    {
      id: 'texture-palette-knife',
      name: 'Palette Knife',
      operations: [
        {
          type: 'paletteKnife',
          amount: 0.94,
          secondaryAmount: 0.74,
        },
      ],
    },
  ],
};

function buildParameterSet(categoryId: StaticFilterCategoryId): FilterParameter[] {
  return [
    {
      id: 'strength',
      labelKey: 'editor.params.strength',
      min: 0,
      max: 1,
      defaultValue: 1,
      step: 0.01,
    },
    {
      id: 'micro',
      labelKey: 'editor.params.micro',
      min: 0,
      max: 1,
      defaultValue: 0.5,
      step: 0.01,
    },
    {
      id: `${categoryId}_bias`,
      labelKey: 'editor.params.bias',
      min: -1,
      max: 1,
      defaultValue: 0,
      step: 0.01,
    },
  ];
}

function buildOperations(
  category: CategoryTemplate,
  index: number,
): FilterOperation[] {
  const operations: FilterOperation[] = [];
  category.blueprints.forEach((blueprint, blueprintIndex) => {
    if (blueprint.every !== undefined && (index + 1) % blueprint.every !== 0) {
      return;
    }
    const seed = category.seed * 100 + index * 10 + blueprintIndex;
    const amount = seededRange(seed, blueprint.min, blueprint.max);
    const secondaryAmount =
      blueprint.secondaryMin === undefined || blueprint.secondaryMax === undefined
        ? undefined
        : seededRange(seed + 997, blueprint.secondaryMin, blueprint.secondaryMax);
    operations.push({
      type: blueprint.type,
      amount,
      secondaryAmount,
    });
  });
  return operations;
}

export const FILTER_CATEGORIES: FilterCategory[] = CATEGORY_TEMPLATES.map(
  ({ id, titleKey, subtitleKey, color }) => ({
    id,
    titleKey,
    subtitleKey,
    color,
  }),
);

export const FILTERS: FilterDefinition[] = CATEGORY_TEMPLATES.flatMap(category => {
  const specialFilters = SPECIAL_FILTERS_BY_CATEGORY[category.id] ?? [];

  return [
    ...specialFilters.map((filter, index) => ({
      ...filter,
      categoryId: category.id,
      indexInCategory: index,
      parameters: buildParameterSet(category.id),
    })),
    ...category.names.map((name, index) => ({
      id: `${category.id}-${index + 1}`,
      name,
      categoryId: category.id,
      indexInCategory: index + specialFilters.length,
      operations: buildOperations(category, index),
      parameters: buildParameterSet(category.id),
    })),
  ];
});

export const FILTER_COUNT = FILTERS.length;
export const FILTERS_BY_ID = Object.fromEntries(FILTERS.map(filter => [filter.id, filter]));
export const FILTERS_BY_CATEGORY = FILTER_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.id] = FILTERS.filter(filter => filter.categoryId === category.id);
    return acc;
  },
  {} as Record<StaticFilterCategoryId, FilterDefinition[]>,
);

export function getFilterById(filterId: string): FilterDefinition {
  return FILTERS_BY_ID[filterId] ?? FILTERS[0];
}
