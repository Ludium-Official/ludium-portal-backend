export function parseId(id: number | string) {
  return typeof id === 'string' ? Number.parseInt(id, 10) : id;
}
