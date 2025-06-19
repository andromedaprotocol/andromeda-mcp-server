import { GasPrice } from '@cosmjs/stargate';

export interface NetworkConfig {
  chainId: string;
  rpcEndpoint: string;
  restEndpoint: string;
  graphqlEndpoint: string;
  kernelAddress: string;
  adodbAddress?: string;
  defaultDenom: string;
  gasPrice: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    chainId: 'galileo-4',
    rpcEndpoint: 'https://api.andromedaprotocol.io/rpc/testnet',
    restEndpoint: 'https://api.andromedaprotocol.io/rest/testnet',
    graphqlEndpoint: 'https://api.andromedaprotocol.io/graphql/testnet',
    kernelAddress: 'andr14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9shptkql',
    defaultDenom: 'uandr',
    gasPrice: '0.025uandr'
  },
  mainnet: {
    chainId: 'andromeda-1',
    rpcEndpoint: 'https://api.andromedaprotocol.io/rpc/mainnet',
    restEndpoint: 'https://api.andromedaprotocol.io/rest/mainnet',
    graphqlEndpoint: 'https://api.andromedaprotocol.io/graphql/mainnet',
    kernelAddress: 'andr14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9shptkql', // Using same as testnet for now - will discover the correct one
    defaultDenom: 'uandr',
    gasPrice: '0.025uandr'
  }
};

// Runtime network selection
export const DEFAULT_ANDROMEDA_NETWORK = 'testnet'; // Clean testnet configuration
export const SELECTED_NETWORK = process.env.ANDROMEDA_NETWORK || DEFAULT_ANDROMEDA_NETWORK;
export const NETWORK_CONFIG = NETWORKS[SELECTED_NETWORK];

if (!NETWORK_CONFIG) {
  throw new Error(`Invalid network: ${SELECTED_NETWORK}. Available networks: ${Object.keys(NETWORKS).join(', ')}`);
}

// Configuration using selected network
export const ANDROMEDA_RPC_ENDPOINT = process.env.ANDROMEDA_RPC_ENDPOINT || NETWORK_CONFIG.rpcEndpoint;
export const ANDROMEDA_REST_ENDPOINT = process.env.ANDROMEDA_REST_ENDPOINT || NETWORK_CONFIG.restEndpoint;
export const ANDROMEDA_GRAPHQL_ENDPOINT = process.env.ANDROMEDA_GRAPHQL_ENDPOINT || NETWORK_CONFIG.graphqlEndpoint;
export const KERNEL_ADDRESS = process.env.KERNEL_ADDRESS || NETWORK_CONFIG.kernelAddress;
export const DEFAULT_GAS_PRICE = GasPrice.fromString(NETWORK_CONFIG.gasPrice);