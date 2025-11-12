/**
 * Test setup file
 * Runs before all tests to configure the environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'none'; // Disable auth for most tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/wavestack_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';
process.env.AUTH_AUDIENCE = 'wavestack-test';
process.env.AUTH_ISSUER = 'wavestack-test';
process.env.PORT = '0'; // Let OS assign port for tests

// Suppress logs during tests (unless DEBUG is set)
if (!process.env.DEBUG) {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
}
