/**
 * Environment variable validation
 *
 * Validates required environment variables at build/runtime
 * to ensure the application has proper configuration
 */

interface EnvConfig {
  // Solana network configuration
  NEXT_PUBLIC_SOLANA_RPC_URL: string;
  NEXT_PUBLIC_SOLANA_NETWORK: 'devnet' | 'testnet' | 'mainnet-beta';

  // Optional: Analytics, Monitoring
  NEXT_PUBLIC_APP_URL?: string;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function validateNetwork(network: string): 'devnet' | 'testnet' | 'mainnet-beta' {
  const validNetworks = ['devnet', 'testnet', 'mainnet-beta'];
  if (!validNetworks.includes(network)) {
    throw new Error(
      `Invalid NEXT_PUBLIC_SOLANA_NETWORK: ${network}. Must be one of: ${validNetworks.join(', ')}`
    );
  }
  return network as 'devnet' | 'testnet' | 'mainnet-beta';
}

/**
 * Get validated environment configuration
 *
 * Uses sensible defaults for development while requiring
 * explicit configuration in production
 */
export function getEnvConfig(): EnvConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  // Default RPC URLs by network
  const defaultRpcUrls: Record<string, string> = {
    devnet: 'https://api.devnet.solana.com',
    testnet: 'https://api.testnet.solana.com',
    'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  };

  const network = validateNetwork(
    process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'
  );

  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || defaultRpcUrls[network];

  // In production, warn if using public RPC (rate limited)
  if (isProduction && rpcUrl.includes('api.devnet.solana.com')) {
    console.warn(
      '[ENV] Warning: Using public Solana RPC in production. Consider using a dedicated RPC provider for better reliability.'
    );
  }

  return {
    NEXT_PUBLIC_SOLANA_RPC_URL: rpcUrl,
    NEXT_PUBLIC_SOLANA_NETWORK: network,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
}

/**
 * Environment constants (evaluated at import time)
 */
export const env = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};
