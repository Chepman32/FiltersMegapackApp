import { FILTER_CATEGORIES, FILTER_COUNT, FILTERS, FILTERS_BY_CATEGORY } from '../src/filters/filterCatalog';

describe('filter catalog', () => {
  it('keeps aggregate counts in sync with the category catalog', () => {
    const countedFilters = FILTER_CATEGORIES.reduce((sum, category) => {
      return sum + (FILTERS_BY_CATEGORY[category.id as keyof typeof FILTERS_BY_CATEGORY]?.length ?? 0);
    }, 0);

    expect(FILTER_CATEGORIES).toHaveLength(12);
    expect(FILTER_COUNT).toBe(FILTERS.length);
    expect(FILTERS).toHaveLength(countedFilters);
  });

  it('contains at least one filter in each category', () => {
    FILTER_CATEGORIES.forEach(category => {
      expect(
        FILTERS_BY_CATEGORY[category.id as keyof typeof FILTERS_BY_CATEGORY] ?? [],
      ).not.toHaveLength(0);
    });
  });

  it('keeps unique filter ids', () => {
    const ids = FILTERS.map(filter => filter.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
