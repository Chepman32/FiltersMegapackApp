import { getFilterById } from './filterCatalog';
import type { FilterDefinition, FilterStack, Recipe } from '../types/filter';

export const DEFAULT_FILTER_ID = 'cinematic-1';

export function createDefaultFilterStack(): FilterStack {
  return {
    filterId: DEFAULT_FILTER_ID,
    intensity: 1,
    parameterValues: {
      strength: 1,
      micro: 0.5,
    },
  };
}

export function resolveFilterStack(stack: FilterStack): FilterDefinition {
  return getFilterById(stack.filterId);
}

export function serializeRecipe(recipe: Recipe): string {
  return JSON.stringify(recipe);
}

export function parseRecipe(serialized: string): Recipe {
  const parsed = JSON.parse(serialized) as Recipe;
  return {
    ...parsed,
    filterStack: {
      ...parsed.filterStack,
      intensity: Number(parsed.filterStack.intensity) || 0,
      parameterValues: parsed.filterStack.parameterValues ?? {},
    },
  };
}

