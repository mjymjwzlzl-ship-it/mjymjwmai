function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }
  return 'development-only-secret-key-change-before-release';
}

module.exports = { getJwtSecret };
