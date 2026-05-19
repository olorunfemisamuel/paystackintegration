export function getFlwSecretKey(): string {
  const key = process.env.FLW_SECRET_KEY
  console.log('FLW_SECRET_KEY loaded:', key ? `${key.slice(0, 20)}...` : 'NOT FOUND ❌')
  if (!key) {
    throw new Error('FLW_SECRET_KEY is not set in environment variables')
  }
  return key
}