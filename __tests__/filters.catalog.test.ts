import { FILTER_CATEGORIES, FILTER_COUNT, FILTERS, FILTERS_BY_CATEGORY } from '../src/filters/filterCatalog';

describe('filter catalog', () => {
  it('contains 240 filters across 12 categories', () => {
    expect(FILTER_CATEGORIES).toHaveLength(12);
    expect(FILTER_COUNT).toBe(240);
    expect(FILTERS).toHaveLength(240);
  });

  it('contains 20 filters in each category', () => {
    FILTER_CATEGORIES.forEach(category => {
      expect(FILTERS_BY_CATEGORY[category.id]).toHaveLength(20);
    });
  });

  it('keeps unique filter ids', () => {
    const ids = FILTERS.map(filter => filter.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

