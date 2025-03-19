export function parseId(id: number | string) {
  return typeof id === 'string' ? Number.parseInt(id, 10) : id;
}

export function validAndNotEmptyArray<T>(arr: T[] | null | undefined): arr is T[] {
  return arr != null && Array.isArray(arr) && arr.length > 0;
}
