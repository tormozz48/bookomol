export function getRequiredEnv<K extends string, V>(key: K): V {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value as V;
}
