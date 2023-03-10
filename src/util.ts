export function makeId(type: string, ...strs: string[]) {
  let id = type;
  for (const str of strs) {
    if (str != undefined && str.length > 0) {
      id += '--' + str.replace('/', '--');
    }
  }
  return id;
}

export function getFromMap<T>(key: string, map: Map<string, T>): T {
  const v = map.get(key);
  if (v == undefined) {
    throw new Error(`not found: ${key}`);
  }
  return v;
}
