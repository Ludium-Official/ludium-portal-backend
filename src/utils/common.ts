import { BigNumber } from 'bignumber.js';

export function parseId(id: number | string) {
  return typeof id === 'string' ? Number.parseInt(id, 10) : id;
}

export function validAndNotEmptyArray<T>(arr: T[] | null | undefined): arr is T[] {
  return arr != null && Array.isArray(arr) && arr.length > 0;
}

export function filterEmptyValues<T>(obj: Record<string, unknown>): T {
  if (obj == null) {
    return {} as T;
  }
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined),
  ) as T;
}

export function formatPrice(price: string | number) {
  try {
    const priceValue = new BigNumber(price);
    if (priceValue.isNegative()) {
      throw new Error('Price cannot be negative');
    }
    return priceValue.toString();
  } catch (_error) {
    throw new Error('Invalid price format');
  }
}

export function isPromise(value: unknown): value is Promise<unknown> {
  return value != null && typeof value === 'object' && 'then' in value;
}
