let counter = 0;

export function createId(prefix = 'id'): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${counter}_${random}`;
}

