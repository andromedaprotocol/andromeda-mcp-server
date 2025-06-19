// Gas limit constants
export const GAS_LIMITS = {
  LOW: '150000',        // Lower gas requirements
  DEFAULT: '200000',    // Default gas limit for standard operations
  STANDARD: '250000',   // Standard gas limit for most ADO operations
  HIGH: '300000',       // Higher gas limit for CW20-Exchange operations and NFT transfers
  NFT_OPS: '400000',    // Specific NFT operations
  COMPLEX: '500000',    // Complex operations
  MAXIMUM: '1000000'    // Maximum gas limit for enhanced fee operations
} as const;

// Transaction fee constants (in uandr)
export const TRANSACTION_FEES = {
  LOW: '3750',          // Lower fee for specific operations
  STANDARD: '5000',     // Standard fee for basic operations
  ADO_STANDARD: '6250', // Standard fee for most ADO operations
  PLATFORM: '5000000', // Platform fee (5 ANDR)
  ENHANCED: '25000'     // Enhanced fee for retry attempts
} as const;

// Fee configuration helper
export const createFeeConfig = (amount: string, gas: string) => ({
  amount: [{ denom: 'uandr', amount }],
  gas
});

// Blockchain constants
export const BLOCKCHAIN_CONSTANTS = {
  DEFAULT_DENOM: 'uandr',
  SEARCH_LIMIT: 50,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000 // milliseconds
} as const;