import { parseRecipe, serializeRecipe } from '../src/filters/recipe';
import type { Recipe } from '../src/types/filter';

describe('recipe serialization', () => {
  it('serializes and deserializes recipe deterministically', () => {
    const recipe: Recipe = {
      id: 'recipe-1',
      name: 'Warm Cinematic',
      createdAt: '2026-03-10T10:00:00.000Z',
      filterStack: {
        filterId: 'cinematic-4',
        intensity: 0.84,
        parameterValues: {
          strength: 0.84,
          micro: 0.42,
        },
      },
    };
    const serialized = serializeRecipe(recipe);
    const parsed = parseRecipe(serialized);
    expect(parsed).toEqual(recipe);
  });
});

