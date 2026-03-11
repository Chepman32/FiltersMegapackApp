import { getFilterById } from './filterCatalog';
import type { FilterDefinition, FilterStack, Recipe } from '../types/filter';

export const NONE_FILTER_ID = '__none__';
export const MAX_MIX_FILTERS = 4;

export function createDefaultFilterStack(): FilterStack {
  return createNeutralFilterStack();
}

export function createNeutralFilterStack(): FilterStack {
  return {
    filterId: NONE_FILTER_ID,
    mixEnabled: false,
    mixFilterIds: [],
    intensity: 1,
    parameterValues: {
      strength: 1,
      micro: 0.5,
    },
  };
}

function clampMixFilterIds(filterIds: string[]): string[] {
  return Array.from(
    new Set(filterIds.filter(filterId => filterId && filterId !== NONE_FILTER_ID)),
  ).slice(0, MAX_MIX_FILTERS);
}

export function normalizeFilterStack(stack: Partial<FilterStack> | null | undefined): FilterStack {
  const neutralStack = createNeutralFilterStack();
  const baseFilterId =
    typeof stack?.filterId === 'string' && stack.filterId.length > 0
      ? stack.filterId
      : NONE_FILTER_ID;
  const mixEnabled = Boolean(stack?.mixEnabled);
  const rawMixFilterIds = Array.isArray(stack?.mixFilterIds)
    ? stack.mixFilterIds
    : [];
  const mixFilterIds = mixEnabled
    ? clampMixFilterIds(
        rawMixFilterIds.length > 0
          ? rawMixFilterIds
          : baseFilterId !== NONE_FILTER_ID
            ? [baseFilterId]
            : [],
      )
    : baseFilterId !== NONE_FILTER_ID
      ? [baseFilterId]
      : [];

  return {
    filterId: mixEnabled
      ? mixFilterIds[mixFilterIds.length - 1] ?? NONE_FILTER_ID
      : baseFilterId,
    mixEnabled,
    mixFilterIds,
    intensity:
      typeof stack?.intensity === 'number' && Number.isFinite(stack.intensity)
        ? stack.intensity
        : neutralStack.intensity,
    parameterValues: {
      ...neutralStack.parameterValues,
      ...(stack?.parameterValues ?? {}),
    },
  };
}

export function getActiveFilterIds(stack: FilterStack): string[] {
  const normalizedStack = normalizeFilterStack(stack);
  if (normalizedStack.mixEnabled) {
    return normalizedStack.mixFilterIds;
  }
  return normalizedStack.filterId === NONE_FILTER_ID ? [] : [normalizedStack.filterId];
}

export function hasActiveFilter(stack: FilterStack): boolean {
  return getActiveFilterIds(stack).length > 0;
}

export function resolveFilterStack(stack: FilterStack): FilterDefinition | null {
  const activeFilterIds = getActiveFilterIds(stack);
  const primaryFilterId = activeFilterIds[activeFilterIds.length - 1];
  if (!primaryFilterId) {
    return null;
  }
  return getFilterById(primaryFilterId);
}

export function resolveFiltersInStack(stack: FilterStack): FilterDefinition[] {
  return getActiveFilterIds(stack).map(getFilterById);
}

export function serializeRecipe(recipe: Recipe): string {
  return JSON.stringify(recipe);
}

export function parseRecipe(serialized: string): Recipe {
  const parsed = JSON.parse(serialized) as Recipe;
  return {
    ...parsed,
    filterStack: normalizeFilterStack({
      ...parsed.filterStack,
      intensity: Number(parsed.filterStack.intensity) || 0,
      parameterValues: parsed.filterStack.parameterValues ?? {},
    }),
  };
}
