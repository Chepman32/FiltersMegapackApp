import { getFilterById } from './filterCatalog';
import type { FilterDefinition, FilterStack, Recipe } from '../types/filter';

export const NONE_FILTER_ID = '__none__';

export function createDefaultFilterStack(): FilterStack {
  return createNeutralFilterStack();
}

export function createNeutralFilterStack(): FilterStack {
  return {
    filterId: NONE_FILTER_ID,
    intensity: 1,
    parameterValues: {
      strength: 1,
      micro: 0.5,
    },
  };
}

export function hasActiveFilter(stack: FilterStack): boolean {
  return stack.filterId !== NONE_FILTER_ID;
}

export function resolveFilterStack(stack: FilterStack): FilterDefinition | null {
  if (!hasActiveFilter(stack)) {
    return null;
  }
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
