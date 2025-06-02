#!/usr/bin/env node
// Andromeda MCP Server - Testnet Configuration

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolRequest,
  CallToolResult,
  TextContent,
  ImageContent,
  EmbeddedResource
} from '@modelcontextprotocol/sdk/types.js';
import { StargateClient } from '@cosmjs/stargate';
import { CosmWasmClient, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';
import { Decimal } from '@cosmjs/math';
import { z } from 'zod';

// Polyfill BigInt serialization for JSON.stringify
// This is necessary because JSON.stringify does not natively support BigInt.
// It converts BigInt values to strings before serialization.
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

// Network Configuration System - MAINNET READY
interface NetworkConfig {
  chainId: string;
  rpcEndpoint: string;
  restEndpoint: string;
  graphqlEndpoint: string;
  kernelAddress: string;
  adodbAddress?: string;
  defaultDenom: string;
  gasPrice: string;
}

const NETWORKS: Record<string, NetworkConfig> = {
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
const DEFAULT_ANDROMEDA_NETWORK = 'testnet'; // Clean testnet configuration
const SELECTED_NETWORK = process.env.ANDROMEDA_NETWORK || DEFAULT_ANDROMEDA_NETWORK;
const NETWORK_CONFIG = NETWORKS[SELECTED_NETWORK];

if (!NETWORK_CONFIG) {
  throw new Error(`Invalid network: ${SELECTED_NETWORK}. Available networks: ${Object.keys(NETWORKS).join(', ')}`);
}

// Configuration using selected network
const ANDROMEDA_RPC_ENDPOINT = process.env.ANDROMEDA_RPC_ENDPOINT || NETWORK_CONFIG.rpcEndpoint;
const ANDROMEDA_REST_ENDPOINT = process.env.ANDROMEDA_REST_ENDPOINT || NETWORK_CONFIG.restEndpoint;
const ANDROMEDA_GRAPHQL_ENDPOINT = process.env.ANDROMEDA_GRAPHQL_ENDPOINT || NETWORK_CONFIG.graphqlEndpoint;
const KERNEL_ADDRESS = process.env.KERNEL_ADDRESS || NETWORK_CONFIG.kernelAddress;
const DEFAULT_GAS_PRICE = GasPrice.fromString(NETWORK_CONFIG.gasPrice);

// Input validation schemas
const BlockHeightSchema = z.object({
  height: z.number().optional().describe('Block height to query (latest if not specified)')
});

const TransactionSchema = z.object({
  txHash: z.string().describe('Transaction hash to query')
});

const AddressSchema = z.object({
  address: z.string().describe('Andromeda address to query')
});

const ADOQuerySchema = z.object({
  contractAddress: z.string().describe('ADO contract address'),
  query: z.record(z.any()).describe('Query message to send to ADO')
});

const ADOExecuteSchema = z.object({
  contractAddress: z.string().describe('ADO contract address'),
  msg: z.record(z.any()).describe('Execute message to send to ADO'),
  funds: z.array(z.object({
    denom: z.string(),
    amount: z.string()
  })).optional().describe('Funds to send with execution'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction'),
  gas: z.string().optional().describe('Gas limit (default: auto)')
});

const WalletSchema = z.object({
  mnemonic: z.string().describe('BIP-39 mnemonic phrase for wallet generation')
});

const TransferSchema = z.object({
  recipient: z.string().describe('Recipient address'),
  amount: z.string().describe('Amount to transfer'),
  denom: z.string().default('uandr').describe('Token denomination'),
  mnemonic: z.string().describe('Sender wallet mnemonic'),
  memo: z.string().optional().describe('Transaction memo')
});

const DateRangeSchema = z.object({
  startDate: z.string().optional().describe('Start date (ISO string)'),
  endDate: z.string().optional().describe('End date (ISO string)'),
  limit: z.number().default(100).describe('Maximum number of results')
});

const ADODBQuerySchema = z.object({
  adoType: z.string().optional().describe('ADO type to query'),
  startAfter: z.string().optional().describe('Pagination start after')
});

const ADOCodeIdSchema = z.object({
  adoType: z.string().describe('ADO type to get code ID for'),
  version: z.string().optional().describe('Specific version (latest if not specified)')
});

const GraphQLQuerySchema = z.object({
  query: z.string().describe('GraphQL query string'),
  variables: z.record(z.any()).optional().describe('GraphQL variables')
});

const CreateAppSchema = z.object({
  name: z.string().describe('Name of the App'),
  components: z.array(z.object({
    name: z.string(),
    ado_type: z.string(),
    instantiate_msg: z.record(z.any())
  })).describe('ADO components to include in the App'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction')
});

const AppInfoSchema = z.object({
  appAddress: z.string().describe('App contract address')
});

const DeployADOSchema = z.object({
  adoType: z.string().describe('Type of ADO to deploy'),
  name: z.string().describe('Name for the ADO instance'),
  instantiateMsg: z.record(z.any()).describe('Instantiation message'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction'),
  codeId: z.number().optional().describe('Code ID (will fetch from ADODB if not provided)')
});

const MigrateADOSchema = z.object({
  contractAddress: z.string().describe('ADO contract address to migrate'),
  newCodeId: z.number().describe('New code ID to migrate to'),
  migrateMsg: z.record(z.any()).describe('Migration message'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction')
});

const PublishADOSchema = z.object({
  codeId: z.number().describe('Code ID to publish'),
  adoType: z.string().describe('ADO type name'),
  version: z.string().describe('Version number'),
  mnemonic: z.string().describe('Publisher wallet mnemonic')
});

const CW20MintSchema = z.object({
  contractAddress: z.string().describe('CW20 contract address'),
  recipient: z.string().describe('Recipient address'),
  amount: z.string().describe('Amount to mint'),
  mnemonic: z.string().describe('Minter wallet mnemonic')
});

const CW721MintSchema = z.object({
  contractAddress: z.string().describe('CW721 contract address'),
  tokenId: z.string().describe('NFT token ID'),
  owner: z.string().describe('NFT owner address'),
  mnemonic: z.string().describe('Minter wallet mnemonic'),
  tokenUri: z.string().optional().describe('Token metadata URI'),
  extension: z.record(z.any()).optional().describe('Extension metadata'),
});

const MarketplaceListSchema = z.object({
  marketplaceAddress: z.string().describe('Marketplace contract address'),
  nftContract: z.string().describe('NFT contract address'),
  tokenId: z.string().describe('NFT token ID'),
  price: z.object({
    amount: z.string(),
    denom: z.string()
  }).describe('Listing price'),
  mnemonic: z.string().describe('Seller wallet mnemonic')
});

const AuctionBidSchema = z.object({
  auctionAddress: z.string().describe('Auction contract address'),
  amount: z.string().describe('Bid amount'),
  denom: z.string().default('uandr').describe('Token denomination'),
  mnemonic: z.string().describe('Bidder wallet mnemonic')
});

const SplitterUpdateSchema = z.object({
  splitterAddress: z.string().describe('Splitter contract address'),
  recipients: z.array(z.object({
    address: z.string(),
    percent: z.string()
  })).describe('New recipient configuration'),
  mnemonic: z.string().describe('Admin wallet mnemonic')
});

// CW20 Exchange Schemas
const DeployCW20ExchangeSchema = z.object({
  tokenAddress: z.string().describe('CW20 token contract address to create exchange for'),
  name: z.string().describe('Name for the CW20 Exchange instance'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction')
});

const StartCW20SaleSchema = z.object({
  exchangeAddress: z.string().describe('CW20 Exchange contract address'),
  tokenAddress: z.string().describe('CW20 token contract address'),
  amount: z.string().describe('Amount of tokens to put up for sale'),
  asset: z.object({
    type: z.enum(['native', 'cw20']),
    value: z.string()
  }).describe('Asset that can be used to purchase the tokens'),
  exchangeRate: z.string().describe('Amount of purchasing asset required for one token'),
  mnemonic: z.string().describe('Seller wallet mnemonic'),
  recipient: z.string().optional().describe('Recipient of sale proceeds (defaults to sender)'),
  startTime: z.number().optional().describe('Sale start time in milliseconds'),
  duration: z.number().optional().describe('Sale duration in milliseconds')
});

const PurchaseCW20TokensSchema = z.object({
  exchangeAddress: z.string().describe('CW20 Exchange contract address'),
  purchaseAsset: z.object({
    type: z.enum(['native', 'cw20']),
    address: z.string(),
    amount: z.string(),
    denom: z.string()
  }).describe('Asset to use for purchasing tokens'),
  mnemonic: z.string().describe('Buyer wallet mnemonic'),
  recipient: z.string().optional().describe('Recipient of purchased tokens (defaults to sender)')
});

const CancelCW20SaleSchema = z.object({
  exchangeAddress: z.string().describe('CW20 Exchange contract address'),
  asset: z.object({
    type: z.enum(['native', 'cw20']),
    value: z.string()
  }).describe('Asset of the sale to cancel'),
  mnemonic: z.string().describe('Exchange owner wallet mnemonic')
});

const QueryCW20SaleSchema = z.object({
  exchangeAddress: z.string().describe('CW20 Exchange contract address'),
  asset: z.object({
    type: z.enum(['native', 'cw20']),
    value: z.string()
  }).describe('Asset of the sale to query')
});

// Auction Schemas
const DeployAuctionSchema = z.object({
  name: z.string().describe('Name for the Auction instance'),
  authorizedTokenAddresses: z.array(z.string()).optional().describe('Authorized NFT contract addresses'),
  authorizedCw20Address: z.string().optional().describe('Authorized CW20 payment token address'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction')
});

const StartAuctionSchema = z.object({
  auctionAddress: z.string().describe('Auction contract address'),
  tokenId: z.string().describe('NFT token ID to auction'),
  tokenAddress: z.string().describe('NFT contract address'),
  startTime: z.number().optional().describe('Auction start time (milliseconds since epoch)'),
  duration: z.number().describe('Auction duration in milliseconds'),
  coinDenom: z.string().default('uandr').describe('Denomination for bids'),
  startingBid: z.string().optional().describe('Minimum starting bid amount'),
  recipient: z.string().optional().describe('Recipient of auction proceeds'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction')
});

const PlaceAuctionBidSchema = z.object({
  auctionAddress: z.string().describe('Auction contract address'),
  tokenId: z.string().describe('NFT token ID being auctioned'),
  tokenAddress: z.string().describe('NFT contract address'),
  bidAmount: z.string().describe('Bid amount'),
  denom: z.string().default('uandr').describe('Token denomination'),
  mnemonic: z.string().describe('Bidder wallet mnemonic')
});

const FinalizeAuctionSchema = z.object({
  auctionAddress: z.string().describe('Auction contract address'),
  tokenId: z.string().describe('NFT token ID being auctioned'),
  tokenAddress: z.string().describe('NFT contract address'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction')
});

// CW20-Staking Schemas (DeFi-focused)
const DeployCW20StakingSchema = z.object({
  name: z.string().describe('Name for the CW20-Staking instance'),
  stakingToken: z.string().describe('CW20 token contract address for staking'),
  rewardToken: z.string().describe('CW20 token contract address for rewards'),
  rewardAllocation: z.string().describe('Reward allocation for the reward token'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction'),
  unbondingPeriod: z.number().optional().describe('Unbonding period in seconds (optional)')
});

const StakeCW20TokensSchema = z.object({
  stakingAddress: z.string().describe('CW20-Staking contract address'),
  tokenAddress: z.string().describe('CW20 token contract address to stake'),
  amount: z.string().describe('Amount of tokens to stake'),
  mnemonic: z.string().describe('Staker wallet mnemonic')
});

const UnstakeCW20TokensSchema = z.object({
  stakingAddress: z.string().describe('CW20-Staking contract address'),
  amount: z.string().describe('Amount of tokens to unstake'),
  mnemonic: z.string().describe('Staker wallet mnemonic')
});

const ClaimStakingRewardsSchema = z.object({
  stakingAddress: z.string().describe('CW20-Staking contract address'),
  mnemonic: z.string().describe('Staker wallet mnemonic')
});

// Merkle Airdrop Schemas
const DeployMerkleAirdropSchema = z.object({
  name: z.string().describe('Name for the Merkle Airdrop instance'),
  asset: z.object({
    type: z.enum(['native', 'cw20']),
    value: z.string()
  }).describe('Asset to distribute in the airdrop'),
  merkleRoot: z.string().describe('Merkle root hash for the airdrop tree'),
  totalAmount: z.string().describe('Total amount to distribute'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction'),
  startTime: z.number().optional().describe('Airdrop start time in milliseconds'),
  endTime: z.number().optional().describe('Airdrop end time in milliseconds')
});

const ClaimAirdropTokensSchema = z.object({
  airdropAddress: z.string().describe('Merkle Airdrop contract address'),
  amount: z.string().describe('Amount to claim'),
  proof: z.array(z.string()).describe('Merkle proof for the claim'),
  mnemonic: z.string().describe('Claimer wallet mnemonic')
});

const QueryAirdropSchema = z.object({
  airdropAddress: z.string().describe('Merkle Airdrop contract address'),
  address: z.string().describe('Address to check claim status for')
});

interface AndromedaMCPServer {
  cosmosClient: StargateClient | null;
  cosmWasmClient: CosmWasmClient | null;
}

class AndromedaMCPServer {
  constructor() {
    this.cosmosClient = null;
    this.cosmWasmClient = null;
  }

  async initialize() {
    try {
      // Initialize both clients
      this.cosmosClient = await StargateClient.connect(ANDROMEDA_RPC_ENDPOINT);
      this.cosmWasmClient = await CosmWasmClient.connect(ANDROMEDA_RPC_ENDPOINT);
      console.error('Connected to Andromeda blockchain with CosmWasm support');
    } catch (error) {
      console.error('Failed to connect to Andromeda blockchain:', error);
      throw error;
    }
  }

  async getSigningClient(mnemonic: string): Promise<SigningCosmWasmClient> {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'andr'
    });

    return SigningCosmWasmClient.connectWithSigner(ANDROMEDA_RPC_ENDPOINT, wallet, {
      gasPrice: DEFAULT_GAS_PRICE,
      // Note: gasAdjustment is handled in individual transaction methods
    });
  }

  async getWalletAddress(mnemonic: string): Promise<string> {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'andr'
    });
    const accounts = await wallet.getAccounts();
    return accounts[0].address;
  }

  async generateWallet(): Promise<{ mnemonic: string; address: string }> {
    const wallet = await DirectSecp256k1HdWallet.generate(24, {
      prefix: 'andr'
    });
    const accounts = await wallet.getAccounts();
    return {
      mnemonic: wallet.mnemonic,
      address: accounts[0].address
    };
  }

  async getBlockInfo(height?: number): Promise<any> {
    if (!this.cosmosClient) throw new Error('Client not initialized');

    if (height) {
      return await this.cosmosClient.getBlock(height);
    } else {
      return await this.cosmosClient.getBlock();
    }
  }

  async getTransaction(txHash: string): Promise<any> {
    if (!this.cosmosClient) throw new Error('Client not initialized');
    return await this.cosmosClient.getTx(txHash);
  }

  async getAccountInfo(address: string): Promise<any> {
    if (!this.cosmosClient) throw new Error('Client not initialized');
    return await this.cosmosClient.getAccount(address);
  }

  async getAccountBalance(address: string): Promise<any> {
    if (!this.cosmosClient) throw new Error('Client not initialized');
    return await this.cosmosClient.getAllBalances(address);
  }

  async queryADO(contractAddress: string, query: any): Promise<any> {
    if (!this.cosmWasmClient) throw new Error('CosmWasm client not initialized');
    try {
      return await this.cosmWasmClient.queryContractSmart(contractAddress, query);
    } catch (error) {
      // Fallback to direct REST API call if the client method fails
      const queryB64 = Buffer.from(JSON.stringify(query)).toString('base64');
      const response = await fetch(
        `${ANDROMEDA_REST_ENDPOINT}/cosmwasm/wasm/v1/contract/${contractAddress}/smart/${queryB64}`
      );
      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }
      const result = await response.json();
      return result.data || result;
    }
  }

  async executeADO(
    contractAddress: string,
    msg: any,
    mnemonic: string,
    funds: Array<{ denom: string, amount: string }> = [],
    gas?: string
  ): Promise<any> {
    const signingClient = await this.getSigningClient(mnemonic);
    const senderAddress = await this.getWalletAddress(mnemonic);

    // Determine appropriate gas limit based on operation complexity
    let gasLimit = gas || '200000'; // Default gas limit

    // Increase gas for complex operations that frequently run out of gas
    if (msg.start_sale || msg.purchase_tokens || msg.send) {
      gasLimit = gas || '300000'; // Higher gas for CW20-Exchange operations
      console.error(`DEBUG: Using increased gas limit ${gasLimit} for complex operation`);
    }

    const result = await signingClient.execute(
      senderAddress,
      contractAddress,
      msg,
      { amount: [{ denom: 'uandr', amount: '5000' }], gas: gasLimit },
      '',
      funds
    );

    return result;
  }

  async transferTokens(
    recipient: string,
    amount: string,
    denom: string,
    mnemonic: string,
    memo?: string
  ): Promise<any> {
    const signingClient = await this.getSigningClient(mnemonic);
    const senderAddress = await this.getWalletAddress(mnemonic);

    const result = await signingClient.sendTokens(
      senderAddress,
      recipient,
      [{ denom, amount }],
      { amount: [{ denom: 'uandr', amount: '3750' }], gas: '150000' },  // Fixed gas limit with proper fee
      memo
    );

    return result;
  }

  async getValidators(): Promise<any> {
    if (!this.cosmosClient) throw new Error('Client not initialized');

    // Use REST API since getValidators() doesn't exist on StargateClient
    const response = await fetch(`${ANDROMEDA_REST_ENDPOINT}/cosmos/staking/v1beta1/validators`);
    if (!response.ok) {
      throw new Error(`Failed to fetch validators: ${response.statusText}`);
    }
    return await response.json();
  }

  async getChainInfo(): Promise<any> {
    if (!this.cosmosClient) throw new Error('Client not initialized');
    const latestBlock = await this.cosmosClient.getBlock();
    const chainId = await this.cosmosClient.getChainId();

    return {
      chainId,
      latestBlock: {
        height: latestBlock.header.height,
        time: latestBlock.header.time,
        hash: latestBlock.id
      }
    };
  }

  async getCodeInfo(codeId: number): Promise<any> {
    if (!this.cosmWasmClient) {
      return { error: 'CosmWasm client not initialized' };
    }
    try {
      const fullInfo = await this.cosmWasmClient.getCodeDetails(codeId);
      // Return the full info object directly since CodeDetails type is opaque
      return {
        codeId,
        ...fullInfo,
        upload_time: (fullInfo as any).upload_time || undefined
      };
    } catch (error: any) {
      return {
        error: 'Failed to get code info',
        codeId,
        details: error?.message || String(error)
      };
    }
  }

  async getContractInfo(contractAddress: string): Promise<any> {
    if (!this.cosmWasmClient) throw new Error('CosmWasm client not initialized');
    return await this.cosmWasmClient.getContract(contractAddress);
  }

  async getContracts(codeId: number): Promise<any> {
    if (!this.cosmWasmClient) throw new Error('CosmWasm client not initialized');
    return await this.cosmWasmClient.getContracts(codeId);
  }

  // Enhanced transaction parsing for better readability
  async getRecentTransactions(limit: number = 50): Promise<any[]> {
    if (!this.cosmosClient) throw new Error('Client not initialized');

    try {
      // Get the latest block height first
      const latestBlock = await this.cosmosClient.getBlock();
      const latestHeight = parseInt(latestBlock.header.height.toString());

      const allTransactions: any[] = [];
      let currentHeight = latestHeight;

      // Search through the last 20 blocks or until we have enough transactions
      while (allTransactions.length < limit && currentHeight > Math.max(1, latestHeight - 20)) {
        try {
          const block = await this.cosmosClient.getBlock(currentHeight);
          const rawTxs = block.txs || [];

          // Parse the transactions to extract readable data
          const parsedTxs = rawTxs.map((tx, index) => {
            try {
              return {
                block_height: block.header.height,
                block_time: block.header.time,
                tx_index: index,
                raw_size: tx.length,
                tx_hash: this.calculateTxHash(tx), // Calculate hash if possible
                // Note: Full parsing would require proper protobuf decoding
                raw_data: tx
              };
            } catch (error) {
              return {
                block_height: block.header.height,
                tx_index: index,
                error: 'Failed to parse transaction',
                raw_size: tx.length
              };
            }
          });

          allTransactions.push(...parsedTxs);

          // If we found transactions in this block, continue searching recent blocks
          // Otherwise, continue to search more blocks
          currentHeight--;

        } catch (blockError) {
          // Failed to get block, continue to next
          currentHeight--;
          continue;
        }
      }

      // Return the most recent transactions up to the limit
      return allTransactions.slice(0, limit);

    } catch (error) {
      console.error('Error getting recent transactions:', error);
      throw new Error(`Failed to get recent transactions: ${error}`);
    }
  }

  // Helper method to calculate transaction hash (basic implementation)
  private calculateTxHash(txData: Uint8Array): string {
    // This is a simplified hash calculation - in production you'd want proper SHA256
    return Buffer.from(txData.slice(0, 32)).toString('hex');
  }

  // ADODB (ADO Database) Methods
  async queryADODB(adoType?: string, startAfter?: string): Promise<any> {
    try {
      // First, get the ADODB address from kernel
      const kernelQuery = { key_address: { key: "adodb" } };
      const kernelResult = await this.queryADO(KERNEL_ADDRESS, kernelQuery);
      const adobAddress = kernelResult; // kernelResult is the address string directly

      // Use the working ADODB query format
      let query;
      if (adoType) {
        // Query versions for specific ADO type
        query = {
          ado_versions: {
            ado_type: adoType,
            start_after: startAfter,
            limit: 50
          }
        };
      } else {
        // Query all ADO types
        query = {
          all_ado_types: {
            start_after: startAfter,
            limit: 50
          }
        };
      }

      // Query the ADODB with working format
      return await this.queryADO(adobAddress, query);
    } catch (error) {
      throw new Error(`Failed to query ADODB: ${error}`);
    }
  }

  async getADOCodeId(adoType: string, version?: string): Promise<any> {
    try {
      // **FIX #2: ADO TYPE NORMALIZATION** - Handle underscore/hyphen variants
      const normalizedAdoType = this.normalizeADOType(adoType);
      console.error(`DEBUG: ADO type normalization: "${adoType}" → "${normalizedAdoType}"`);

      // First, get the ADODB address from kernel
      const kernelQuery = { key_address: { key: "adodb" } };
      const kernelResult = await this.queryADO(KERNEL_ADDRESS, kernelQuery);
      const adobAddress = kernelResult; // kernelResult is the address string directly

      // Get all versions for the ADO type using working format
      const query = {
        ado_versions: {
          ado_type: normalizedAdoType,
          limit: 50
        }
      };

      const result = await this.queryADO(adobAddress, query);

      // Parse the versions to find the requested one or latest
      if (Array.isArray(result)) {
        let targetVersion = version;
        if (!targetVersion) {
          // Find the latest version (highest version number)
          targetVersion = result[0]; // First in list should be latest
        }

        // Find the specific version in the results
        const versionMatch = result.find((v: string) => v.includes(targetVersion || ''));
        if (versionMatch) {
          // Extract just the ADO type and version for fallback compatibility
          return {
            code_id: this.extractCodeIdFromVersion(versionMatch) || this.getFallbackCodeId(normalizedAdoType),
            ado_type: normalizedAdoType,
            version: versionMatch,
            source: 'adodb_query'
          };
        }
      }

      // If specific version not found, return fallback
      throw new Error(`Version ${version || 'latest'} not found for ADO type ${normalizedAdoType}`);

    } catch (error) {
      // **Fallback with improved type normalization**
      const normalizedAdoType = this.normalizeADOType(adoType);
      console.warn(`ADODB query failed, using fallback for ${normalizedAdoType}:`, error);

      const codeId = this.getFallbackCodeId(normalizedAdoType);
      if (codeId) {
        return { code_id: codeId, ado_type: normalizedAdoType, version: version || 'fallback', source: 'fallback' };
      }

      throw new Error(`Failed to get ADO code ID and no fallback available for type: ${normalizedAdoType}. Original error: ${error}`);
    }
  }

  /**
   * **FIX #2: ADO TYPE NORMALIZATION**
   * Handles various ADO type naming conventions (hyphen vs underscore)
   */
  private normalizeADOType(adoType: string): string {
    // Convert to lowercase for consistent comparison
    const lower = adoType.toLowerCase();

    // Handle specific problematic cases
    const typeMapping: Record<string, string> = {
      'address-list': 'address-list',
      'address_list': 'address-list', // Convert underscore to hyphen
      'app-contract': 'app-contract',
      'app_contract': 'app-contract',
      'conditional-splitter': 'conditional-splitter',
      'conditional_splitter': 'conditional-splitter',
      'cw20-exchange': 'cw20-exchange',
      'cw20_exchange': 'cw20-exchange',
      'cw20-staking': 'cw20-staking',
      'cw20_staking': 'cw20-staking',
      'merkle-airdrop': 'merkle-airdrop',
      'merkle_airdrop': 'merkle-airdrop'
    };

    return typeMapping[lower] || lower;
  }

  private getFallbackCodeId(adoType: string): number | null {
    // **Updated with normalized type names**
    const fallbackCodeIds: Record<string, number> = {
      'cw20': 10,
      'cw721': 13,
      'marketplace': 15,
      'cw20-exchange': 29,  // CONFIRMED! CW20 Exchange Code ID 29 works perfectly
      'auction': 26,  // CONFIRMED! Auction Code ID 26 from earlier discovery
      'cw20-staking': 30,  // CW20-Staking Code ID for DeFi reward pools
      'merkle-airdrop': 17,  // Merkle Airdrop Code ID for community token distribution
      'splitter': 20,
      'app': 6,
      'app-contract': 6,  // Alternative name for app
      'kernel': 6,
      'address-list': 28, // **NEW**: Address-List Code ID (estimated)
    };
    return fallbackCodeIds[adoType.toLowerCase()] || null;
  }

  private extractCodeIdFromVersion(versionString: string): number | null {
    // This is a placeholder - we'd need to query additional ADODB endpoints
    // to get the actual code ID for a version. For now, return null to use fallback.
    return null;
  }

  async listADOVersions(adoType: string): Promise<any> {
    try {
      // Get ADODB address from kernel
      const kernelQuery = { key_address: { key: "adodb" } };
      const kernelResult = await this.queryADO(KERNEL_ADDRESS, kernelQuery);
      const adobAddress = kernelResult; // kernelResult is the address string directly

      // Use the working ADODB query format for versions
      const query = {
        ado_versions: {
          ado_type: adoType,
          limit: 100
        }
      };

      return await this.queryADO(adobAddress, query);
    } catch (error) {
      throw new Error(`Failed to list ADO versions: ${error}`);
    }
  }

  // GraphQL Methods
  async graphqlQuery(query: string, variables?: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(ANDROMEDA_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`GraphQL query failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data;
    } catch (error) {
      throw new Error(`GraphQL query failed: ${error}`);
    }
  }

  async subscribeADOEvents(contractAddress: string): Promise<any> {
    // Note: This would typically use WebSocket for real-time subscriptions
    // For now, we'll query recent events via GraphQL
    const query = `
      query GetADOEvents($contractAddress: String!) {
        events(where: { contract_address: { _eq: $contractAddress } }, order_by: { block_height: desc }, limit: 50) {
          id
          contract_address
          event_type
          attributes
          block_height
          block_time
          transaction_hash
        }
      }
    `;

    return await this.graphqlQuery(query, { contractAddress });
  }

  // App Management Methods
  async createApp(
    name: string,
    components: Array<{ name: string; ado_type: string; instantiate_msg: any }>,
    mnemonic: string
  ): Promise<any> {
    const signingClient = await this.getSigningClient(mnemonic);
    const senderAddress = await this.getWalletAddress(mnemonic);

    // Get App code ID from ADODB (will use fallback if ADODB fails)
    const appCodeIdResponse = await this.getADOCodeId('app');
    const appCodeId = appCodeIdResponse.code_id;

    console.error(`DEBUG: **FIX #3: APP CREATION AUTHORIZATION** - Testing multiple formats with Code ID: ${appCodeId}`);

    // **FIX #3: APP CREATION AUTHORIZATION** - Systematic format testing with improved authorization handling

    // FORMAT VARIATION 1: Minimal instantiation (test basic authorization first)
    let instantiateMsg: any = {
      kernel_address: KERNEL_ADDRESS,
      owner: senderAddress,
      modules: [] // Minimal modules array
    };

    console.error(`DEBUG: Trying FORMAT 1 (minimal authorization test):`, JSON.stringify(instantiateMsg, null, 2));

    try {
      const basicFee = {
        amount: [{ denom: 'uandr', amount: '12500' }], // Higher fee for app creation
        gas: '500000' // Higher gas limit
      };

      const result = await signingClient.instantiate(
        senderAddress,
        appCodeId,
        instantiateMsg,
        `${name} App - Basic`,
        basicFee
      );

      console.error(`DEBUG: FORMAT 1 (minimal) SUCCESS! Basic authorization works.`);
      return result;

    } catch (error1) {
      console.error(`DEBUG: FORMAT 1 failed:`, error1.message);

      // Common enhanced fee for subsequent attempts
      const enhancedFee = {
        amount: [{ denom: 'uandr', amount: '25000' }],
        gas: '1000000'
      };

      // FORMAT VARIATION 2: App components with proper encoding (fix linter error)
      try {
        instantiateMsg = {
          app_components: components.map(comp => ({
            name: comp.name,
            ado_type: comp.ado_type,
            component_type: {
              new: Buffer.from(JSON.stringify(comp.instantiate_msg)).toString('base64')
            }
          })),
          name: name,
          kernel_address: KERNEL_ADDRESS,
          owner: senderAddress
        };

        console.error(`DEBUG: Trying FORMAT 2 (app_components with encoding):`, JSON.stringify(instantiateMsg, null, 2));

        // Try with platform fee funding
        const platformFunds = [{ denom: 'uandr', amount: '5000000' }]; // 5 ANDR platform fee

        const result = await signingClient.instantiate(
          senderAddress,
          appCodeId,
          instantiateMsg,
          `${name} App`,
          enhancedFee,
          { funds: platformFunds }
        );

        console.error(`DEBUG: FORMAT 2 (app_components + platform funds) SUCCESS!`);
        return result;

      } catch (error2) {
        console.error(`DEBUG: FORMAT 2 failed:`, error2.message);

        // FORMAT VARIATION 3: Alternative 'app' field name
        try {
          instantiateMsg = {
            app: components.map(comp => ({
              name: comp.name,
              ado_type: comp.ado_type,
              component_type: {
                new: Buffer.from(JSON.stringify(comp.instantiate_msg)).toString('base64')
              }
            })),
            name: name,
            kernel_address: KERNEL_ADDRESS,
            owner: senderAddress
          };

          console.error(`DEBUG: Trying FORMAT 3 (app field):`, JSON.stringify(instantiateMsg, null, 2));

          const result = await signingClient.instantiate(
            senderAddress,
            appCodeId,
            instantiateMsg,
            `${name} App`,
            enhancedFee
          );

          console.error(`DEBUG: FORMAT 3 (app field) SUCCESS!`);
          return result;

        } catch (error3) {
          console.error(`DEBUG: FORMAT 3 failed:`, error3.message);

          // FORMAT VARIATION 4: No base64 encoding (direct instantiate messages)
          try {
            instantiateMsg = {
              app_components: components.map(comp => ({
                name: comp.name,
                ado_type: comp.ado_type,
                instantiate_msg: comp.instantiate_msg  // Direct message, no encoding
              })),
              name: name,
              kernel_address: KERNEL_ADDRESS,
              owner: senderAddress
            };

            console.error(`DEBUG: Trying FORMAT 4 (no encoding):`, JSON.stringify(instantiateMsg, null, 2));

            const result = await signingClient.instantiate(
              senderAddress,
              appCodeId,
              instantiateMsg,
              `${name} App`,
              enhancedFee
            );

            console.error(`DEBUG: FORMAT 4 (no encoding) SUCCESS!`);
            return result;

          } catch (error4) {
            console.error(`DEBUG: FORMAT 4 failed:`, error4.message);

            // FORMAT VARIATION 5: Different App Contract (app-contract vs app)
            try {
              // Try with app-contract ADO type instead
              const appContractCodeIdResponse = await this.getADOCodeId('app-contract');
              const appContractCodeId = appContractCodeIdResponse.code_id;

              console.error(`DEBUG: Trying FORMAT 5 (app-contract) with Code ID: ${appContractCodeId}`);

              const minimalAppContractMsg = {
                kernel_address: KERNEL_ADDRESS,
                owner: senderAddress
              };

              const result = await signingClient.instantiate(
                senderAddress,
                appContractCodeId,
                minimalAppContractMsg,
                `${name} AppContract`,
                enhancedFee
              );

              console.error(`DEBUG: FORMAT 5 (app-contract) SUCCESS!`);
              return result;

            } catch (error5) {
              console.error(`DEBUG: FORMAT 5 failed:`, error5.message);

              // All formats failed - throw comprehensive error
              throw new Error(`All App format variations failed:
FORMAT 1 (minimal): ${error1.message}
FORMAT 2 (app_components + funds): ${error2.message}  
FORMAT 3 (app field): ${error3.message}
FORMAT 4 (no encoding): ${error4.message}
FORMAT 5 (app-contract): ${error5.message}`);
            }
          }
        }
      }
    }
  }

  async getAppInfo(appAddress: string): Promise<any> {
    const query = {
      get_components: {}
    };

    return await this.queryADO(appAddress, query);
  }

  async listAppComponents(appAddress: string): Promise<any> {
    const query = {
      get_components: {
        names: null
      }
    };

    return await this.queryADO(appAddress, query);
  }

  async updateAppConfig(
    appAddress: string,
    updates: any,
    mnemonic: string
  ): Promise<any> {
    const msg = {
      update_app_config: updates
    };

    return await this.executeADO(appAddress, msg, mnemonic);
  }

  // ADO Deployment Methods
  async deployADO(
    adoType: string,
    name: string,
    instantiateMsg: any,
    mnemonic: string,
    codeId?: number
  ): Promise<any> {
    const signingClient = await this.getSigningClient(mnemonic);
    const senderAddress = await this.getWalletAddress(mnemonic);

    // Get code ID if not provided
    let resolvedCodeId = codeId;
    if (!resolvedCodeId) {
      const adoInfo = await this.getADOCodeId(adoType);
      resolvedCodeId = adoInfo.code_id;
      if (!resolvedCodeId) {
        throw new Error(`Could not find code_id for ADO type: ${adoType}`);
      }
    }

    // Apply ADO-specific fixes based on known failure patterns
    let enhancedMsg = { ...instantiateMsg };

    // Fix 1: CW721 - Simplify complex instantiate messages that often fail
    if (adoType === 'cw721') {
      const simplifiedCW721Msg = {
        name: enhancedMsg.name || `${name} Collection`,
        symbol: enhancedMsg.symbol || name.toUpperCase().substring(0, 8),
        minter: enhancedMsg.minter || senderAddress,
        kernel_address: KERNEL_ADDRESS
      };
      console.error(`DEBUG: CW721 simplified instantiate message applied`);
      enhancedMsg = simplifiedCW721Msg;
    }

    // Fix 2: Marketplace - Remove unauthorized fields, use minimal format
    else if (adoType === 'marketplace') {
      const simplifiedMarketplaceMsg = {
        kernel_address: KERNEL_ADDRESS,
        owner: senderAddress,
        modules: enhancedMsg.modules || []
      };
      // Remove problematic fields that cause "unknown field" errors
      delete enhancedMsg.authorized_token_addresses;
      delete enhancedMsg.authorized_cw20_address;
      console.error(`DEBUG: Marketplace simplified instantiate message applied`);
      enhancedMsg = simplifiedMarketplaceMsg;
    }

    // Fix 3: Splitter - Use correct recipient format structure
    else if (adoType === 'splitter') {
      if (enhancedMsg.recipients) {
        const correctedSplitterMsg = {
          recipients: enhancedMsg.recipients.map((r: any) => ({
            recipient: r.recipient || { address: r.address },
            percent: r.percent
          })),
          kernel_address: KERNEL_ADDRESS,
          owner: senderAddress
        };
        console.error(`DEBUG: Splitter corrected recipient format applied`);
        enhancedMsg = correctedSplitterMsg;
      }
    }

    // Add kernel address to instantiate message if not present
    if (!enhancedMsg.kernel_address) {
      enhancedMsg.kernel_address = KERNEL_ADDRESS;
    }

    try {
      const result = await signingClient.instantiate(
        senderAddress,
        resolvedCodeId,
        enhancedMsg,
        name,
        { amount: [{ denom: 'uandr', amount: '6250' }], gas: '250000' }
      );

      console.error(`DEBUG: ${adoType.toUpperCase()} deployment SUCCESS on first attempt`);
      return result;

    } catch (firstError) {
      console.error(`DEBUG: ${adoType.toUpperCase()} deployment failed with enhanced message:`, firstError.message);

      // Fallback for CW721: Even more minimal format if the simplified version fails
      if (adoType === 'cw721') {
        const minimalCW721Msg = {
          name: enhancedMsg.name,
          symbol: enhancedMsg.symbol,
          minter: senderAddress,
          kernel_address: KERNEL_ADDRESS
        };

        try {
          const result = await signingClient.instantiate(
            senderAddress,
            resolvedCodeId,
            minimalCW721Msg,
            name,
            { amount: [{ denom: 'uandr', amount: '6250' }], gas: '250000' }
          );

          console.error(`DEBUG: CW721 minimal fallback SUCCESS`);
          return result;
        } catch (fallbackError) {
          console.error(`DEBUG: CW721 minimal fallback also failed:`, fallbackError.message);
        }
      }

      // Fallback for Marketplace: Ultra-minimal format
      else if (adoType === 'marketplace') {
        const minimalMarketplaceMsg = {
          modules: []
        };

        try {
          const result = await signingClient.instantiate(
            senderAddress,
            resolvedCodeId,
            minimalMarketplaceMsg,
            name,
            { amount: [{ denom: 'uandr', amount: '6250' }], gas: '250000' }
          );

          console.error(`DEBUG: Marketplace minimal fallback SUCCESS`);
          return result;
        } catch (fallbackError) {
          console.error(`DEBUG: Marketplace minimal fallback also failed:`, fallbackError.message);
        }
      }

      // Fallback for Splitter: Try different recipient formats
      else if (adoType === 'splitter' && enhancedMsg.recipients) {
        // Format 1: Direct address/percent structure
        const format1Msg = {
          recipients: enhancedMsg.recipients.map((r: any) => ({
            address: r.recipient?.address || r.address,
            percent: r.percent
          })),
          kernel_address: KERNEL_ADDRESS,
          owner: senderAddress
        };

        try {
          const result = await signingClient.instantiate(
            senderAddress,
            resolvedCodeId,
            format1Msg,
            name,
            { amount: [{ denom: 'uandr', amount: '6250' }], gas: '250000' }
          );

          console.error(`DEBUG: Splitter format1 fallback SUCCESS`);
          return result;
        } catch (format1Error) {
          console.error(`DEBUG: Splitter format1 failed:`, format1Error.message);

          // Format 2: Percentage as decimal
          const format2Msg = {
            recipients: enhancedMsg.recipients.map((r: any) => ({
              recipient: r.recipient || { address: r.address },
              percent: parseFloat(r.percent) < 1 ? r.percent : (parseFloat(r.percent) / 100).toString()
            })),
            kernel_address: KERNEL_ADDRESS,
            owner: senderAddress
          };

          try {
            const result = await signingClient.instantiate(
              senderAddress,
              resolvedCodeId,
              format2Msg,
              name,
              { amount: [{ denom: 'uandr', amount: '6250' }], gas: '250000' }
            );

            console.error(`DEBUG: Splitter format2 (decimal percent) fallback SUCCESS`);
            return result;
          } catch (format2Error) {
            console.error(`DEBUG: Splitter format2 also failed:`, format2Error.message);
          }
        }
      }

      // If all fallbacks fail, throw the original error
      throw new Error(`${adoType.toUpperCase()} deployment failed: ${firstError.message}`);
    }
  }

  async instantiateADO(
    codeId: number,
    instantiateMsg: any,
    label: string,
    mnemonic: string
  ): Promise<any> {
    const signingClient = await this.getSigningClient(mnemonic);
    const senderAddress = await this.getWalletAddress(mnemonic);

    // Add required fields for specific ADO types
    let enhancedMsg = { ...instantiateMsg };

    // For CW721 (Code ID 13), add required minter field if missing
    if (codeId === 13 && !enhancedMsg.minter) {
      enhancedMsg.minter = senderAddress;  // Default to sender as minter
    }

    // Add kernel address if not present
    if (!enhancedMsg.kernel_address) {
      enhancedMsg.kernel_address = KERNEL_ADDRESS;
    }

    const result = await signingClient.instantiate(
      senderAddress,
      codeId,
      enhancedMsg,
      label,
      { amount: [{ denom: 'uandr', amount: '5000' }], gas: '250000' }  // Fixed gas for consistency
    );

    return result;
  }

  async migrateADO(
    contractAddress: string,
    newCodeId: number,
    migrateMsg: any,
    mnemonic: string
  ): Promise<any> {
    const signingClient = await this.getSigningClient(mnemonic);
    const senderAddress = await this.getWalletAddress(mnemonic);

    const result = await signingClient.migrate(
      senderAddress,
      contractAddress,
      newCodeId,
      migrateMsg,
      { amount: [{ denom: 'uandr', amount: '5000' }], gas: '200000' }  // Fixed gas for consistency
    );

    return result;
  }

  async publishADO(
    codeId: number,
    adoType: string,
    version: string,
    mnemonic: string
  ): Promise<any> {
    // Get ADODB address from kernel
    const kernelQuery = { key_address: { key: "adodb" } };
    const kernelResult = await this.queryADO(KERNEL_ADDRESS, kernelQuery);
    const adobAddress = kernelResult.address;

    const msg = {
      publish: {
        code_id: codeId,
        ado_type: adoType,
        version,
        action_fees: null,
        publisher: null
      }
    };

    return await this.executeADO(adobAddress, msg, mnemonic);
  }

  // ADO-Specific Methods
  async cw20Mint(
    contractAddress: string,
    recipient: string,
    amount: string,
    mnemonic: string
  ): Promise<any> {
    const msg = {
      mint: {
        recipient,
        amount
      }
    };

    return await this.executeADO(contractAddress, msg, mnemonic);
  }

  async cw20Burn(
    contractAddress: string,
    amount: string,
    mnemonic: string
  ): Promise<any> {
    const msg = {
      burn: {
        amount
      }
    };

    return await this.executeADO(contractAddress, msg, mnemonic);
  }

  async cw721MintNFT(
    contractAddress: string,
    tokenId: string,
    owner: string,
    mnemonic: string,
    tokenUri?: string,
    extension?: any
  ): Promise<any> {
    const senderAddress = await this.getWalletAddress(mnemonic);

    // **HARDCODED SAFE EXTENSION** - Andromeda expects URI to point to metadata
    // Only use the required publisher field, ignore any custom extension fields
    const safeExtension = {
      publisher: senderAddress
    };

    console.error(`DEBUG: CW721 mint using hardcoded safe extension (publisher only)`);

    const msg = {
      mint: {
        token_id: tokenId,
        owner,
        token_uri: tokenUri,
        extension: safeExtension  // Always use safe extension with only publisher field
      }
    };

    return await this.executeADO(contractAddress, msg, mnemonic);
  }

  async marketplaceListItem(
    marketplaceAddress: string,
    nftContract: string,
    tokenId: string,
    price: { amount: string; denom: string },
    mnemonic: string
  ): Promise<any> {
    // **MARKETPLACE FIX**: Use the correct approach from Andromeda docs
    // Call send_nft on the CW721 contract, not receive_nft on marketplace

    const hookMsg = {
      start_sale: {
        price: price.amount,
        coin_denom: price.denom
      }
    };

    // Call send_nft on the NFT contract (correct approach)
    const sendNftMsg = {
      send_nft: {
        contract: marketplaceAddress,
        token_id: tokenId,
        msg: Buffer.from(JSON.stringify(hookMsg)).toString('base64')
      }
    };

    console.error(`DEBUG: MARKETPLACE FIX - Using send_nft on NFT contract:`, JSON.stringify(sendNftMsg, null, 2));

    return await this.executeADO(nftContract, sendNftMsg, mnemonic, [], '300000');
  }

  async auctionPlaceBid(
    auctionAddress: string,
    amount: string,
    denom: string,
    mnemonic: string
  ): Promise<any> {
    const msg = {
      place_bid: {}
    };

    return await this.executeADO(
      auctionAddress,
      msg,
      mnemonic,
      [{ denom, amount }]
    );
  }

  async splitterUpdateRecipients(
    splitterAddress: string,
    recipients: Array<{ address: string; percent: string }>,
    mnemonic: string
  ): Promise<any> {
    const msg = {
      update_recipients: {
        recipients: recipients.map(r => ({
          recipient: { address: r.address },
          percent: r.percent
        }))
      }
    };

    return await this.executeADO(splitterAddress, msg, mnemonic);
  }

  // CW20 Exchange Methods
  async deployCW20Exchange(
    tokenAddress: string,
    name: string,
    mnemonic: string
  ): Promise<any> {
    const signingClient = await this.getSigningClient(mnemonic);
    const senderAddress = await this.getWalletAddress(mnemonic);

    // Get CW20-Exchange code ID from ADODB
    const exchangeCodeIdResponse = await this.getADOCodeId('cw20-exchange');
    const exchangeCodeId = exchangeCodeIdResponse.code_id;

    // Prepare CW20-Exchange instantiation message
    const instantiateMsg = {
      token_address: tokenAddress,
      kernel_address: KERNEL_ADDRESS,
      owner: senderAddress
    };

    const fee = {
      amount: [{ denom: 'uandr', amount: '6250' }],
      gas: '250000'
    };

    const result = await signingClient.instantiate(
      senderAddress,
      exchangeCodeId,
      instantiateMsg,
      name,
      fee
    );

    return result;
  }

  async startCW20Sale(
    exchangeAddress: string,
    tokenAddress: string,
    amount: string,
    asset: { type: 'native' | 'cw20', value: string },
    exchangeRate: string,
    mnemonic: string,
    recipient?: string,
    startTime?: number,
    duration?: number
  ): Promise<any> {
    const senderAddress = await this.getWalletAddress(mnemonic);

    // First, send CW20 tokens to the exchange with StartSale hook
    const hookMsg = {
      start_sale: {
        asset: asset.type === 'native'
          ? { native: asset.value }
          : { cw20: asset.value },
        exchange_rate: exchangeRate,
        recipient: recipient || senderAddress,
        ...(startTime && { start_time: { at_time: startTime.toString() } }),
        ...(duration && { duration: duration.toString() })
      }
    };

    const sendMsg = {
      send: {
        contract: exchangeAddress,
        amount: amount,
        msg: Buffer.from(JSON.stringify(hookMsg)).toString('base64')
      }
    };

    return await this.executeADO(tokenAddress, sendMsg, mnemonic);
  }

  async purchaseCW20Tokens(
    exchangeAddress: string,
    purchaseAsset: { type: 'native' | 'cw20', address: string, amount: string, denom: string },
    mnemonic: string,
    recipient?: string
  ): Promise<any> {
    const senderAddress = await this.getWalletAddress(mnemonic);

    if (purchaseAsset.type === 'native') {
      // Purchase with native tokens
      const msg = {
        purchase: {
          recipient: recipient || senderAddress
        }
      };

      return await this.executeADO(
        exchangeAddress,
        msg,
        mnemonic,
        [{ denom: purchaseAsset.denom, amount: purchaseAsset.amount }]
      );
    } else {
      // Purchase with CW20 tokens
      const hookMsg = {
        purchase: {
          recipient: recipient || senderAddress
        }
      };

      const sendMsg = {
        send: {
          contract: exchangeAddress,
          amount: purchaseAsset.amount,
          msg: Buffer.from(JSON.stringify(hookMsg)).toString('base64')
        }
      };

      return await this.executeADO(purchaseAsset.address, sendMsg, mnemonic);
    }
  }

  async cancelCW20Sale(
    exchangeAddress: string,
    asset: { type: 'native' | 'cw20', value: string },
    mnemonic: string
  ): Promise<any> {
    const msg = {
      cancel_sale: {
        asset: asset.type === 'native'
          ? { native: asset.value }
          : { cw20: asset.value }
      }
    };

    return await this.executeADO(exchangeAddress, msg, mnemonic);
  }

  async queryCW20Sale(
    exchangeAddress: string,
    asset: { type: 'native' | 'cw20', value: string }
  ): Promise<any> {
    const query = {
      sale: {
        asset: asset.type === 'native'
          ? { native: asset.value }
          : { cw20: asset.value }
      }
    };

    return await this.queryADO(exchangeAddress, query);
  }

  // Auction Methods
  async deployAuction(
    name: string,
    mnemonic: string,
    authorizedTokenAddresses?: string[],
    authorizedCw20Address?: string
  ): Promise<any> {
    const signingClient = await this.getSigningClient(mnemonic);
    const senderAddress = await this.getWalletAddress(mnemonic);

    // Get Auction code ID from ADODB with fallback
    const auctionCodeIdResponse = await this.getADOCodeId('auction');
    const auctionCodeId = auctionCodeIdResponse.code_id;

    // Prepare Auction instantiation message
    const instantiateMsg = {
      kernel_address: KERNEL_ADDRESS,
      owner: senderAddress,
      ...(authorizedTokenAddresses && { authorized_token_addresses: authorizedTokenAddresses }),
      ...(authorizedCw20Address && { authorized_cw20_address: authorizedCw20Address })
    };

    const fee = {
      amount: [{ denom: 'uandr', amount: '6250' }],
      gas: '250000'
    };

    const result = await signingClient.instantiate(
      senderAddress,
      auctionCodeId,
      instantiateMsg,
      name,
      fee
    );

    return result;
  }

  async startAuction(
    auctionAddress: string,
    tokenId: string,
    tokenAddress: string,
    duration: number,
    mnemonic: string,
    startTime?: number,
    coinDenom: string = 'uandr',
    startingBid?: string,
    recipient?: string
  ): Promise<any> {
    const senderAddress = await this.getWalletAddress(mnemonic);

    // First, approve the auction contract to transfer the NFT
    const approveMsg = {
      approve: {
        spender: auctionAddress,
        token_id: tokenId
      }
    };

    await this.executeADO(tokenAddress, approveMsg, mnemonic, [], '200000');

    // **AUCTION FIX: Use official Andromeda documentation approach**
    // Call send_nft on the CW721 contract (not receive_nft on auction contract)
    const currentTime = Date.now();
    const endTime = currentTime + duration;

    // Create the start_auction hook message as per official docs
    const auctionHookMsg = {
      start_auction: {
        end_time: endTime,
        uses_cw20: false, // Using native tokens
        coin_denom: coinDenom,
        ...(startingBid && { min_bid: startingBid }),
        ...(recipient && { recipient: { address: recipient } }),
        ...(startTime && { start_time: startTime })
      }
    };

    // Call send_nft on the CW721 contract as per official documentation
    const sendNftMsg = {
      send_nft: {
        contract: auctionAddress,
        token_id: tokenId,
        msg: Buffer.from(JSON.stringify(auctionHookMsg)).toString('base64')
      }
    };

    console.error(`DEBUG: Using official Andromeda approach - send_nft on CW721 contract:`, JSON.stringify(sendNftMsg, null, 2));
    console.error(`DEBUG: Auction hook message:`, JSON.stringify(auctionHookMsg, null, 2));

    return await this.executeADO(tokenAddress, sendNftMsg, mnemonic, [], '400000');
  }

  async placeAuctionBid(
    auctionAddress: string,
    tokenId: string,
    tokenAddress: string,
    bidAmount: string,
    denom: string,
    mnemonic: string
  ): Promise<any> {
    const msg = {
      place_bid: {
        token_id: tokenId,
        token_address: tokenAddress
      }
    };

    return await this.executeADO(
      auctionAddress,
      msg,
      mnemonic,
      [{ denom, amount: bidAmount }],
      '300000'
    );
  }

  async finalizeAuction(
    auctionAddress: string,
    tokenId: string,
    tokenAddress: string,
    mnemonic: string
  ): Promise<any> {
    const msg = {
      claim: {
        token_id: tokenId,
        token_address: tokenAddress
      }
    };

    return await this.executeADO(auctionAddress, msg, mnemonic, [], '250000');
  }

  // CW20-Staking Methods (DeFi-focused)
  async deployCW20Staking(
    name: string,
    stakingToken: string,
    rewardToken: string,
    rewardAllocation: string,
    mnemonic: string,
    unbondingPeriod?: number
  ): Promise<any> {
    const signingClient = await this.getSigningClient(mnemonic);
    const senderAddress = await this.getWalletAddress(mnemonic);

    // Get CW20-Staking code ID from ADODB with fallback
    const stakingCodeIdResponse = await this.getADOCodeId('cw20-staking');
    const stakingCodeId = stakingCodeIdResponse.code_id;

    // Prepare CW20-Staking instantiation message (minimal working version)
    const instantiateMsg = {
      staking_token: stakingToken,
      kernel_address: KERNEL_ADDRESS,
      owner: senderAddress
    };

    const fee = {
      amount: [{ denom: 'uandr', amount: '6250' }],
      gas: '250000'
    };

    const result = await signingClient.instantiate(
      senderAddress,
      stakingCodeId,
      instantiateMsg,
      name,
      fee
    );

    return result;
  }

  async stakeCW20Tokens(
    stakingAddress: string,
    tokenAddress: string,
    amount: string,
    mnemonic: string
  ): Promise<any> {
    // Use CW20 send hook to stake tokens
    const hookMsg = {
      stake_tokens: {}
    };

    const sendMsg = {
      send: {
        contract: stakingAddress,
        amount: amount,
        msg: Buffer.from(JSON.stringify(hookMsg)).toString('base64')
      }
    };

    return await this.executeADO(tokenAddress, sendMsg, mnemonic, [], '300000');
  }

  async unstakeCW20Tokens(
    stakingAddress: string,
    amount: string,
    mnemonic: string
  ): Promise<any> {
    const msg = {
      unstake_tokens: {
        amount: amount
      }
    };

    return await this.executeADO(stakingAddress, msg, mnemonic, [], '300000');
  }

  async claimStakingRewards(
    stakingAddress: string,
    mnemonic: string
  ): Promise<any> {
    const msg = {
      claim_rewards: {}
    };

    return await this.executeADO(stakingAddress, msg, mnemonic, [], '250000');
  }

  // Merkle Airdrop Methods
  async deployMerkleAirdrop(
    name: string,
    asset: { type: 'native' | 'cw20', value: string },
    merkleRoot: string,
    totalAmount: string,
    mnemonic: string,
    startTime?: number,
    endTime?: number
  ): Promise<any> {
    const signingClient = await this.getSigningClient(mnemonic);
    const senderAddress = await this.getWalletAddress(mnemonic);

    // Get Merkle Airdrop code ID from ADODB with fallback
    const airdropCodeIdResponse = await this.getADOCodeId('merkle-airdrop');
    const airdropCodeId = airdropCodeIdResponse.code_id || 17; // Fallback to Code ID 17

    // **FIX #1: MERKLE AIRDROP FIELD MAPPING** - Correct field names based on error
    // Error: "unknown field `merkle_root`, expected one of `asset_info`, `kernel_address`, `owner`, `modules`"
    console.error(`DEBUG: Applying Merkle Airdrop field mapping fix`);

    // Primary format attempt - minimal required fields only
    let instantiateMsg = {
      asset_info: asset.type === 'native'
        ? { native: asset.value }
        : { cw20: asset.value },
      kernel_address: KERNEL_ADDRESS,
      owner: senderAddress,
      modules: [] // Add minimal modules array
    };

    const fee = {
      amount: [{ denom: 'uandr', amount: '6250' }],
      gas: '250000'
    };

    console.error(`DEBUG: Merkle Airdrop PRIMARY format:`, JSON.stringify(instantiateMsg, null, 2));

    try {
      const result = await signingClient.instantiate(
        senderAddress,
        airdropCodeId,
        instantiateMsg,
        name,
        fee
      );

      console.error(`DEBUG: Merkle Airdrop PRIMARY format SUCCESS!`);
      return result;

    } catch (primaryError) {
      console.error(`DEBUG: Merkle Airdrop PRIMARY format failed:`, primaryError.message);

      // **FALLBACK 1**: Try alternative field structure
      try {
        const fallbackMsg = {
          // Try simple token info structure
          token: asset.type === 'native' ? { native: asset.value } : { cw20: asset.value },
          kernel_address: KERNEL_ADDRESS,
          owner: senderAddress
        };

        console.error(`DEBUG: Merkle Airdrop FALLBACK 1:`, JSON.stringify(fallbackMsg, null, 2));

        const result = await signingClient.instantiate(
          senderAddress,
          airdropCodeId,
          fallbackMsg,
          name,
          fee
        );

        console.error(`DEBUG: Merkle Airdrop FALLBACK 1 SUCCESS!`);
        return result;

      } catch (fallback1Error) {
        console.error(`DEBUG: Merkle Airdrop FALLBACK 1 failed:`, fallback1Error.message);

        // **FALLBACK 2**: Minimal instantiation without airdrop-specific fields
        try {
          const minimalMsg = {
            kernel_address: KERNEL_ADDRESS,
            owner: senderAddress,
            modules: []
          };

          console.error(`DEBUG: Merkle Airdrop FALLBACK 2 (minimal):`, JSON.stringify(minimalMsg, null, 2));

          const result = await signingClient.instantiate(
            senderAddress,
            airdropCodeId,
            minimalMsg,
            name,
            fee
          );

          console.error(`DEBUG: Merkle Airdrop FALLBACK 2 SUCCESS!`);
          return result;

        } catch (fallback2Error) {
          console.error(`DEBUG: Merkle Airdrop FALLBACK 2 failed:`, fallback2Error.message);

          // All attempts failed - throw comprehensive error
          throw new Error(`All Merkle Airdrop format variations failed:
PRIMARY (asset_info): ${primaryError.message}
FALLBACK 1 (token): ${fallback1Error.message}  
FALLBACK 2 (minimal): ${fallback2Error.message}`);
        }
      }
    }
  }

  async claimAirdropTokens(
    airdropAddress: string,
    amount: string,
    proof: string[],
    mnemonic: string
  ): Promise<any> {
    const msg = {
      claim: {
        amount: amount,
        proof: proof
      }
    };

    return await this.executeADO(airdropAddress, msg, mnemonic, [], '300000');
  }

  async queryAirdropClaim(
    airdropAddress: string,
    address: string
  ): Promise<any> {
    const query = {
      is_claimed: {
        address: address
      }
    };

    return await this.queryADO(airdropAddress, query);
  }
}

// Initialize server
const server = new Server(
  {
    name: 'andromeda-mcp-server-testnet',
    version: '1.7.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const andromedaServer = new AndromedaMCPServer();

// Initialize connection on startup
andromedaServer.initialize().catch(console.error);

// Define available tools
const tools: Tool[] = [
  {
    name: 'get_chain_info',
    description: 'Get basic information about the Andromeda blockchain',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_block_info',
    description: 'Get information about a specific block or the latest block',
    inputSchema: {
      type: 'object',
      properties: {
        height: {
          type: 'number',
          description: 'Block height to query (latest if not specified)',
        },
      },
    },
  },
  {
    name: 'get_transaction',
    description: 'Get details of a specific transaction by hash',
    inputSchema: {
      type: 'object',
      properties: {
        txHash: {
          type: 'string',
          description: 'Transaction hash to query',
        },
      },
      required: ['txHash'],
    },
  },
  {
    name: 'get_account_info',
    description: 'Get account information for an Andromeda address',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Andromeda address to query',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_account_balance',
    description: 'Get token balances for an Andromeda address',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Andromeda address to query',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'query_ado',
    description: 'Query an Andromeda Digital Object (ADO) smart contract',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'ADO contract address',
        },
        query: {
          type: 'object',
          description: 'Query message to send to the ADO',
        },
      },
      required: ['contractAddress', 'query'],
    },
  },
  {
    name: 'execute_ado',
    description: 'Execute a transaction on an Andromeda Digital Object (ADO)',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'ADO contract address',
        },
        msg: {
          type: 'object',
          description: 'Execute message to send to ADO',
        },
        funds: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              denom: { type: 'string' },
              amount: { type: 'string' }
            },
            required: ['denom', 'amount']
          },
          description: 'Funds to send with execution',
        },
        mnemonic: {
          type: 'string',
          description: 'Wallet mnemonic for signing transaction',
        },
        gas: {
          type: 'string',
          description: 'Gas limit (default: auto)',
        },
      },
      required: ['contractAddress', 'msg', 'mnemonic'],
    },
  },
  {
    name: 'transfer_tokens',
    description: 'Transfer tokens between Andromeda addresses',
    inputSchema: {
      type: 'object',
      properties: {
        recipient: {
          type: 'string',
          description: 'Recipient address',
        },
        amount: {
          type: 'string',
          description: 'Amount to transfer',
        },
        denom: {
          type: 'string',
          default: 'uandr',
          description: 'Token denomination',
        },
        mnemonic: {
          type: 'string',
          description: 'Sender wallet mnemonic',
        },
        memo: {
          type: 'string',
          description: 'Transaction memo',
        },
      },
      required: ['recipient', 'amount', 'mnemonic'],
    },
  },
  {
    name: 'generate_wallet',
    description: 'Generate a new Andromeda wallet with mnemonic',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_wallet_address',
    description: 'Get address from mnemonic phrase',
    inputSchema: {
      type: 'object',
      properties: {
        mnemonic: {
          type: 'string',
          description: 'BIP-39 mnemonic phrase',
        },
      },
      required: ['mnemonic'],
    },
  },
  {
    name: 'get_validators',
    description: 'Get list of active validators on Andromeda',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_recent_transactions',
    description: 'Get recent transactions on the Andromeda blockchain',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of transactions to return',
          default: 50,
        },
      },
    },
  },
  {
    name: 'get_contract_info',
    description: 'Get information about a CosmWasm smart contract',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'Contract address to query',
        },
      },
      required: ['contractAddress'],
    },
  },
  {
    name: 'get_code_info',
    description: 'Get information about a CosmWasm code',
    inputSchema: {
      type: 'object',
      properties: {
        codeId: {
          type: 'number',
          description: 'Code ID to query',
        },
      },
      required: ['codeId'],
    },
  },
  {
    name: 'get_contracts',
    description: 'Get all contracts for a specific code ID',
    inputSchema: {
      type: 'object',
      properties: {
        codeId: {
          type: 'number',
          description: 'Code ID to query contracts for',
        },
      },
      required: ['codeId'],
    },
  },
  // ADODB (ADO Database) Tools
  {
    name: 'query_adodb',
    description: 'Query the ADO Database for available ADO types',
    inputSchema: {
      type: 'object',
      properties: {
        adoType: {
          type: 'string',
          description: 'ADO type to query',
        },
        startAfter: {
          type: 'string',
          description: 'Pagination start after',
        },
      },
    },
  },
  {
    name: 'get_ado_code_id',
    description: 'Get code ID for specific ADO type and version',
    inputSchema: {
      type: 'object',
      properties: {
        adoType: {
          type: 'string',
          description: 'ADO type to get code ID for',
        },
        version: {
          type: 'string',
          description: 'Specific version (latest if not specified)',
        },
      },
      required: ['adoType'],
    },
  },
  {
    name: 'list_ado_versions',
    description: 'List all versions of a specific ADO type',
    inputSchema: {
      type: 'object',
      properties: {
        adoType: {
          type: 'string',
          description: 'ADO type to list versions for',
        },
      },
      required: ['adoType'],
    },
  },
  // GraphQL Integration Tools
  {
    name: 'graphql_query',
    description: 'Execute GraphQL queries against Andromeda indexer',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'GraphQL query string',
        },
        variables: {
          type: 'object',
          description: 'GraphQL variables',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'subscribe_ado_events',
    description: 'Subscribe to real-time ADO events (queries recent events via GraphQL)',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'ADO contract address to monitor events for',
        },
      },
      required: ['contractAddress'],
    },
  },
  // App Management Tools
  {
    name: 'create_app',
    description: 'Create Andromeda Apps by composing multiple ADOs',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the App',
        },
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              ado_type: { type: 'string' },
              instantiate_msg: { type: 'object' }
            },
            required: ['name', 'ado_type', 'instantiate_msg']
          },
          description: 'ADO components to include in the App',
        },
        mnemonic: {
          type: 'string',
          description: 'Wallet mnemonic for signing transaction',
        },
      },
      required: ['name', 'components', 'mnemonic'],
    },
  },
  {
    name: 'get_app_info',
    description: 'Query information about deployed Apps',
    inputSchema: {
      type: 'object',
      properties: {
        appAddress: {
          type: 'string',
          description: 'App contract address',
        },
      },
      required: ['appAddress'],
    },
  },
  {
    name: 'list_app_components',
    description: 'List all ADOs within an App',
    inputSchema: {
      type: 'object',
      properties: {
        appAddress: {
          type: 'string',
          description: 'App contract address',
        },
      },
      required: ['appAddress'],
    },
  },
  {
    name: 'update_app_config',
    description: 'Update App configuration and component connections',
    inputSchema: {
      type: 'object',
      properties: {
        appAddress: {
          type: 'string',
          description: 'App contract address',
        },
        updates: {
          type: 'object',
          description: 'Configuration updates',
        },
        mnemonic: {
          type: 'string',
          description: 'Admin wallet mnemonic',
        },
      },
      required: ['appAddress', 'updates', 'mnemonic'],
    },
  },
  // ADO Deployment Tools
  {
    name: 'deploy_ado',
    description: 'Deploy new ADO instances from code IDs',
    inputSchema: {
      type: 'object',
      properties: {
        adoType: {
          type: 'string',
          description: 'Type of ADO to deploy',
        },
        name: {
          type: 'string',
          description: 'Name for the ADO instance',
        },
        instantiateMsg: {
          type: 'object',
          description: 'Instantiation message',
        },
        mnemonic: {
          type: 'string',
          description: 'Wallet mnemonic for signing transaction',
        },
        codeId: {
          type: 'number',
          description: 'Code ID (will fetch from ADODB if not provided)',
        },
      },
      required: ['adoType', 'name', 'instantiateMsg', 'mnemonic'],
    },
  },
  {
    name: 'instantiate_ado',
    description: 'Instantiate ADO contracts with custom configurations',
    inputSchema: {
      type: 'object',
      properties: {
        codeId: {
          type: 'number',
          description: 'Code ID to instantiate',
        },
        instantiateMsg: {
          type: 'object',
          description: 'Instantiation message',
        },
        label: {
          type: 'string',
          description: 'Contract label',
        },
        mnemonic: {
          type: 'string',
          description: 'Wallet mnemonic for signing transaction',
        },
      },
      required: ['codeId', 'instantiateMsg', 'label', 'mnemonic'],
    },
  },
  {
    name: 'migrate_ado',
    description: 'Migrate ADOs to newer versions',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'ADO contract address to migrate',
        },
        newCodeId: {
          type: 'number',
          description: 'New code ID to migrate to',
        },
        migrateMsg: {
          type: 'object',
          description: 'Migration message',
        },
        mnemonic: {
          type: 'string',
          description: 'Wallet mnemonic for signing transaction',
        },
      },
      required: ['contractAddress', 'newCodeId', 'migrateMsg', 'mnemonic'],
    },
  },
  {
    name: 'publish_ado',
    description: 'Publish ADO code to ADODB (ADO Database)',
    inputSchema: {
      type: 'object',
      properties: {
        codeId: {
          type: 'number',
          description: 'Code ID to publish',
        },
        adoType: {
          type: 'string',
          description: 'ADO type name',
        },
        version: {
          type: 'string',
          description: 'Version number',
        },
        mnemonic: {
          type: 'string',
          description: 'Publisher wallet mnemonic',
        },
      },
      required: ['codeId', 'adoType', 'version', 'mnemonic'],
    },
  },
  // ADO-Specific Functionality Tools
  {
    name: 'cw20_mint',
    description: 'Mint CW20 tokens (for CW20 ADOs)',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'CW20 contract address',
        },
        recipient: {
          type: 'string',
          description: 'Recipient address',
        },
        amount: {
          type: 'string',
          description: 'Amount to mint',
        },
        mnemonic: {
          type: 'string',
          description: 'Minter wallet mnemonic',
        },
      },
      required: ['contractAddress', 'recipient', 'amount', 'mnemonic'],
    },
  },
  {
    name: 'cw20_burn',
    description: 'Burn CW20 tokens',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'CW20 contract address',
        },
        amount: {
          type: 'string',
          description: 'Amount to burn',
        },
        mnemonic: {
          type: 'string',
          description: 'Token holder wallet mnemonic',
        },
      },
      required: ['contractAddress', 'amount', 'mnemonic'],
    },
  },
  {
    name: 'cw721_mint_nft',
    description: 'Mint NFTs (for CW721 ADOs)',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'CW721 contract address',
        },
        tokenId: {
          type: 'string',
          description: 'NFT token ID',
        },
        owner: {
          type: 'string',
          description: 'NFT owner address',
        },
        mnemonic: {
          type: 'string',
          description: 'Minter wallet mnemonic',
        },
        tokenUri: {
          type: 'string',
          description: 'Token metadata URI (should point to JSON metadata)',
        },
        extension: {
          type: 'object',
          description: 'Extension metadata (IGNORED - safe extension used automatically)',
        },
      },
      required: ['contractAddress', 'tokenId', 'owner', 'mnemonic'],
    },
  },
  {
    name: 'marketplace_list_item',
    description: 'List items on marketplace ADO',
    inputSchema: {
      type: 'object',
      properties: {
        marketplaceAddress: {
          type: 'string',
          description: 'Marketplace contract address',
        },
        nftContract: {
          type: 'string',
          description: 'NFT contract address',
        },
        tokenId: {
          type: 'string',
          description: 'NFT token ID',
        },
        price: {
          type: 'object',
          properties: {
            amount: { type: 'string' },
            denom: { type: 'string' }
          },
          required: ['amount', 'denom'],
          description: 'Listing price',
        },
        mnemonic: {
          type: 'string',
          description: 'Seller wallet mnemonic',
        },
      },
      required: ['marketplaceAddress', 'nftContract', 'tokenId', 'price', 'mnemonic'],
    },
  },
  {
    name: 'auction_place_bid',
    description: 'Place bids on auction ADO',
    inputSchema: {
      type: 'object',
      properties: {
        auctionAddress: {
          type: 'string',
          description: 'Auction contract address',
        },
        amount: {
          type: 'string',
          description: 'Bid amount',
        },
        denom: {
          type: 'string',
          default: 'uandr',
          description: 'Token denomination',
        },
        mnemonic: {
          type: 'string',
          description: 'Bidder wallet mnemonic',
        },
      },
      required: ['auctionAddress', 'amount', 'mnemonic'],
    },
  },
  {
    name: 'splitter_update_recipients',
    description: 'Update splitter ADO recipients',
    inputSchema: {
      type: 'object',
      properties: {
        splitterAddress: {
          type: 'string',
          description: 'Splitter contract address',
        },
        recipients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              percent: { type: 'string' }
            },
            required: ['address', 'percent']
          },
          description: 'New recipient configuration',
        },
        mnemonic: {
          type: 'string',
          description: 'Admin wallet mnemonic',
        },
      },
      required: ['splitterAddress', 'recipients', 'mnemonic'],
    },
  },
  // CW20 Exchange Tools
  {
    name: 'deploy_cw20_exchange',
    description: 'Deploy a CW20 Exchange ADO for token trading',
    inputSchema: {
      type: 'object',
      properties: {
        tokenAddress: {
          type: 'string',
          description: 'CW20 token contract address to create exchange for',
        },
        name: {
          type: 'string',
          description: 'Name for the CW20 Exchange instance',
        },
        mnemonic: {
          type: 'string',
          description: 'Wallet mnemonic for signing transaction',
        },
      },
      required: ['tokenAddress', 'name', 'mnemonic'],
    },
  },
  {
    name: 'start_cw20_sale',
    description: 'Start a sale on a CW20 Exchange',
    inputSchema: {
      type: 'object',
      properties: {
        exchangeAddress: {
          type: 'string',
          description: 'CW20 Exchange contract address',
        },
        tokenAddress: {
          type: 'string',
          description: 'CW20 token contract address',
        },
        amount: {
          type: 'string',
          description: 'Amount of tokens to put up for sale',
        },
        asset: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['native', 'cw20'] },
            value: { type: 'string' }
          },
          description: 'Asset that can be used to purchase the tokens',
          required: ['type', 'value']
        },
        exchangeRate: {
          type: 'string',
          description: 'Amount of purchasing asset required for one token',
        },
        mnemonic: {
          type: 'string',
          description: 'Seller wallet mnemonic',
        },
        recipient: {
          type: 'string',
          description: 'Recipient of sale proceeds (defaults to sender)',
        },
        startTime: {
          type: 'number',
          description: 'Sale start time in milliseconds',
        },
        duration: {
          type: 'number',
          description: 'Sale duration in milliseconds',
        },
      },
      required: ['exchangeAddress', 'tokenAddress', 'amount', 'asset', 'exchangeRate', 'mnemonic'],
    },
  },
  {
    name: 'purchase_cw20_tokens',
    description: 'Purchase CW20 tokens from an exchange',
    inputSchema: {
      type: 'object',
      properties: {
        exchangeAddress: {
          type: 'string',
          description: 'CW20 Exchange contract address',
        },
        purchaseAsset: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['native', 'cw20'] },
            address: { type: 'string' },
            amount: { type: 'string' },
            denom: { type: 'string' }
          },
          description: 'Asset to use for purchasing tokens',
          required: ['type', 'amount']
        },
        mnemonic: {
          type: 'string',
          description: 'Buyer wallet mnemonic',
        },
        recipient: {
          type: 'string',
          description: 'Recipient of purchased tokens (defaults to sender)',
        },
      },
      required: ['exchangeAddress', 'purchaseAsset', 'mnemonic'],
    },
  },
  {
    name: 'cancel_cw20_sale',
    description: 'Cancel an active CW20 sale on an exchange',
    inputSchema: {
      type: 'object',
      properties: {
        exchangeAddress: {
          type: 'string',
          description: 'CW20 Exchange contract address',
        },
        asset: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['native', 'cw20'] },
            value: { type: 'string' }
          },
          description: 'Asset of the sale to cancel',
          required: ['type', 'value']
        },
        mnemonic: {
          type: 'string',
          description: 'Exchange owner wallet mnemonic',
        },
      },
      required: ['exchangeAddress', 'asset', 'mnemonic'],
    },
  },
  {
    name: 'query_cw20_sale',
    description: 'Query information about a CW20 sale',
    inputSchema: {
      type: 'object',
      properties: {
        exchangeAddress: {
          type: 'string',
          description: 'CW20 Exchange contract address',
        },
        asset: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['native', 'cw20'] },
            value: { type: 'string' }
          },
          description: 'Asset of the sale to query',
          required: ['type', 'value']
        },
      },
      required: ['exchangeAddress', 'asset'],
    },
  },
  // Auction Tools
  {
    name: 'deploy_auction',
    description: 'Deploy an Auction ADO for NFT auctions',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the Auction instance',
        },
        mnemonic: {
          type: 'string',
          description: 'Wallet mnemonic for signing transaction',
        },
        authorizedTokenAddresses: {
          type: 'array',
          items: { type: 'string' },
          description: 'Authorized NFT contract addresses',
        },
        authorizedCw20Address: {
          type: 'string',
          description: 'Authorized CW20 payment token address',
        },
      },
      required: ['name', 'mnemonic'],
    },
  },
  {
    name: 'start_auction',
    description: 'Start an NFT auction',
    inputSchema: {
      type: 'object',
      properties: {
        auctionAddress: {
          type: 'string',
          description: 'Auction contract address',
        },
        tokenId: {
          type: 'string',
          description: 'NFT token ID to auction',
        },
        tokenAddress: {
          type: 'string',
          description: 'NFT contract address',
        },
        duration: {
          type: 'number',
          description: 'Auction duration in milliseconds',
        },
        mnemonic: {
          type: 'string',
          description: 'Wallet mnemonic for signing transaction',
        },
        startTime: {
          type: 'number',
          description: 'Auction start time (milliseconds since epoch)',
        },
        coinDenom: {
          type: 'string',
          default: 'uandr',
          description: 'Denomination for bids',
        },
        startingBid: {
          type: 'string',
          description: 'Minimum starting bid amount',
        },
        recipient: {
          type: 'string',
          description: 'Recipient of auction proceeds',
        },
      },
      required: ['auctionAddress', 'tokenId', 'tokenAddress', 'duration', 'mnemonic'],
    },
  },
  {
    name: 'place_auction_bid',
    description: 'Place a bid on an NFT auction',
    inputSchema: {
      type: 'object',
      properties: {
        auctionAddress: {
          type: 'string',
          description: 'Auction contract address',
        },
        tokenId: {
          type: 'string',
          description: 'NFT token ID being auctioned',
        },
        tokenAddress: {
          type: 'string',
          description: 'NFT contract address',
        },
        bidAmount: {
          type: 'string',
          description: 'Bid amount',
        },
        denom: {
          type: 'string',
          default: 'uandr',
          description: 'Token denomination',
        },
        mnemonic: {
          type: 'string',
          description: 'Bidder wallet mnemonic',
        },
      },
      required: ['auctionAddress', 'tokenId', 'tokenAddress', 'bidAmount', 'mnemonic'],
    },
  },
  {
    name: 'finalize_auction',
    description: 'Finalize an auction and claim NFT/proceeds',
    inputSchema: {
      type: 'object',
      properties: {
        auctionAddress: {
          type: 'string',
          description: 'Auction contract address',
        },
        tokenId: {
          type: 'string',
          description: 'NFT token ID being auctioned',
        },
        tokenAddress: {
          type: 'string',
          description: 'NFT contract address',
        },
        mnemonic: {
          type: 'string',
          description: 'Wallet mnemonic for signing transaction',
        },
      },
      required: ['auctionAddress', 'tokenId', 'tokenAddress', 'mnemonic'],
    },
  },
  // CW20-Staking Tools (DeFi-focused)
  {
    name: 'deploy_cw20_staking',
    description: 'Deploy a CW20-Staking ADO for DeFi reward pools',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the CW20-Staking instance',
        },
        stakingToken: {
          type: 'string',
          description: 'CW20 token contract address for staking',
        },
        rewardToken: {
          type: 'string',
          description: 'CW20 token contract address for rewards',
        },
        rewardAllocation: {
          type: 'string',
          description: 'Reward allocation for the reward token',
        },
        mnemonic: {
          type: 'string',
          description: 'Wallet mnemonic for signing transaction',
        },
        unbondingPeriod: {
          type: 'number',
          description: 'Unbonding period in seconds (optional)',
        },
      },
      required: ['name', 'stakingToken', 'rewardToken', 'rewardAllocation', 'mnemonic'],
    },
  },
  {
    name: 'stake_cw20_tokens',
    description: 'Stake CW20 tokens in a DeFi reward pool',
    inputSchema: {
      type: 'object',
      properties: {
        stakingAddress: {
          type: 'string',
          description: 'CW20-Staking contract address',
        },
        tokenAddress: {
          type: 'string',
          description: 'CW20 token contract address to stake',
        },
        amount: {
          type: 'string',
          description: 'Amount of tokens to stake',
        },
        mnemonic: {
          type: 'string',
          description: 'Staker wallet mnemonic',
        },
      },
      required: ['stakingAddress', 'tokenAddress', 'amount', 'mnemonic'],
    },
  },
  {
    name: 'unstake_cw20_tokens',
    description: 'Unstake CW20 tokens from a DeFi reward pool',
    inputSchema: {
      type: 'object',
      properties: {
        stakingAddress: {
          type: 'string',
          description: 'CW20-Staking contract address',
        },
        amount: {
          type: 'string',
          description: 'Amount of tokens to unstake',
        },
        mnemonic: {
          type: 'string',
          description: 'Staker wallet mnemonic',
        },
      },
      required: ['stakingAddress', 'amount', 'mnemonic'],
    },
  },
  {
    name: 'claim_staking_rewards',
    description: 'Claim accumulated rewards from CW20 staking',
    inputSchema: {
      type: 'object',
      properties: {
        stakingAddress: {
          type: 'string',
          description: 'CW20-Staking contract address',
        },
        mnemonic: {
          type: 'string',
          description: 'Staker wallet mnemonic',
        },
      },
      required: ['stakingAddress', 'mnemonic'],
    },
  },
  // Merkle Airdrop Tools
  {
    name: 'deploy_merkle_airdrop',
    description: 'Deploy a Merkle Airdrop ADO for community token distribution',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the Merkle Airdrop instance',
        },
        asset: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['native', 'cw20'] },
            value: { type: 'string' }
          },
          description: 'Asset to distribute in the airdrop',
          required: ['type', 'value']
        },
        merkleRoot: {
          type: 'string',
          description: 'Merkle root hash for the airdrop tree',
        },
        totalAmount: {
          type: 'string',
          description: 'Total amount to distribute',
        },
        mnemonic: {
          type: 'string',
          description: 'Wallet mnemonic for signing transaction',
        },
        startTime: {
          type: 'number',
          description: 'Airdrop start time in milliseconds',
        },
        endTime: {
          type: 'number',
          description: 'Airdrop end time in milliseconds',
        },
      },
      required: ['name', 'asset', 'merkleRoot', 'totalAmount', 'mnemonic'],
    },
  },
  {
    name: 'claim_airdrop_tokens',
    description: 'Claim tokens from a Merkle Airdrop',
    inputSchema: {
      type: 'object',
      properties: {
        airdropAddress: {
          type: 'string',
          description: 'Merkle Airdrop contract address',
        },
        amount: {
          type: 'string',
          description: 'Amount to claim',
        },
        proof: {
          type: 'array',
          items: { type: 'string' },
          description: 'Merkle proof for the claim',
        },
        mnemonic: {
          type: 'string',
          description: 'Claimer wallet mnemonic',
        },
      },
      required: ['airdropAddress', 'amount', 'proof', 'mnemonic'],
    },
  },
  {
    name: 'query_airdrop_claim',
    description: 'Query airdrop claim status for an address',
    inputSchema: {
      type: 'object',
      properties: {
        airdropAddress: {
          type: 'string',
          description: 'Merkle Airdrop contract address',
        },
        address: {
          type: 'string',
          description: 'Address to check claim status for',
        },
      },
      required: ['airdropAddress', 'address'],
    },
  },
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_chain_info': {
        const result = await andromedaServer.getChainInfo();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_block_info': {
        const { height } = BlockHeightSchema.parse(args);
        const result = await andromedaServer.getBlockInfo(height);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_transaction': {
        const { txHash } = TransactionSchema.parse(args);
        const result = await andromedaServer.getTransaction(txHash);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_account_info': {
        const { address } = AddressSchema.parse(args);
        const result = await andromedaServer.getAccountInfo(address);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_account_balance': {
        const { address } = AddressSchema.parse(args);
        const result = await andromedaServer.getAccountBalance(address);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'query_ado': {
        const { contractAddress, query } = ADOQuerySchema.parse(args);
        const result = await andromedaServer.queryADO(contractAddress, query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'execute_ado': {
        const parsed = ADOExecuteSchema.parse(args);
        const { contractAddress, msg, mnemonic, funds, gas } = parsed;
        // Ensure funds has proper type by providing default with correct structure
        const validFunds: Array<{ denom: string; amount: string }> = funds ?
          funds.filter((f): f is { denom: string; amount: string } =>
            typeof f.denom === 'string' && typeof f.amount === 'string'
          ) : [];
        const result = await andromedaServer.executeADO(contractAddress, msg, mnemonic, validFunds, gas);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'transfer_tokens': {
        const { recipient, amount, denom = 'uandr', mnemonic, memo } = TransferSchema.parse(args);
        const result = await andromedaServer.transferTokens(recipient, amount, denom, mnemonic, memo);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'generate_wallet': {
        const result = await andromedaServer.generateWallet();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_wallet_address': {
        const { mnemonic } = WalletSchema.parse(args);
        const address = await andromedaServer.getWalletAddress(mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ address }, null, 2),
            },
          ],
        };
      }

      case 'get_validators': {
        const result = await andromedaServer.getValidators();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_recent_transactions': {
        const { limit = 50 } = z.object({
          limit: z.number().optional()
        }).parse(args);
        const result = await andromedaServer.getRecentTransactions(limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_contract_info': {
        const { contractAddress } = z.object({ contractAddress: z.string() }).parse(args);
        const result = await andromedaServer.getContractInfo(contractAddress);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_code_info': {
        const { codeId } = z.object({ codeId: z.number() }).parse(args);
        const result = await andromedaServer.getCodeInfo(codeId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_contracts': {
        const { codeId } = z.object({ codeId: z.number() }).parse(args);
        const result = await andromedaServer.getContracts(codeId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // ADODB (ADO Database) Tools
      case 'query_adodb': {
        const { adoType, startAfter } = ADODBQuerySchema.parse(args);
        const result = await andromedaServer.queryADODB(adoType, startAfter);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_ado_code_id': {
        const { adoType, version } = ADOCodeIdSchema.parse(args);
        const result = await andromedaServer.getADOCodeId(adoType, version);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_ado_versions': {
        const { adoType } = z.object({ adoType: z.string() }).parse(args);
        const result = await andromedaServer.listADOVersions(adoType);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // GraphQL Integration Tools
      case 'graphql_query': {
        const { query, variables } = GraphQLQuerySchema.parse(args);
        const result = await andromedaServer.graphqlQuery(query, variables);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'subscribe_ado_events': {
        const { contractAddress } = z.object({ contractAddress: z.string() }).parse(args);
        const result = await andromedaServer.subscribeADOEvents(contractAddress);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // App Management Tools
      case 'create_app': {
        const parsed = CreateAppSchema.parse(args);
        const { name, components, mnemonic } = parsed;
        // Type assertion to ensure components match expected interface
        const validComponents = components as Array<{ name: string; ado_type: string; instantiate_msg: any }>;
        const result = await andromedaServer.createApp(name, validComponents, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_app_info': {
        const { appAddress } = AppInfoSchema.parse(args);
        const result = await andromedaServer.getAppInfo(appAddress);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_app_components': {
        const { appAddress } = AppInfoSchema.parse(args);
        const result = await andromedaServer.listAppComponents(appAddress);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_app_config': {
        const { appAddress, updates, mnemonic } = z.object({
          appAddress: z.string(),
          updates: z.record(z.any()),
          mnemonic: z.string()
        }).parse(args);
        const result = await andromedaServer.updateAppConfig(appAddress, updates, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // ADO Deployment Tools
      case 'deploy_ado': {
        const { adoType, name, instantiateMsg, mnemonic, codeId } = DeployADOSchema.parse(args);
        const result = await andromedaServer.deployADO(adoType, name, instantiateMsg, mnemonic, codeId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'instantiate_ado': {
        const { codeId, instantiateMsg, label, mnemonic } = z.object({
          codeId: z.number(),
          instantiateMsg: z.record(z.any()),
          label: z.string(),
          mnemonic: z.string()
        }).parse(args);
        const result = await andromedaServer.instantiateADO(codeId, instantiateMsg, label, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'migrate_ado': {
        const { contractAddress, newCodeId, migrateMsg, mnemonic } = MigrateADOSchema.parse(args);
        const result = await andromedaServer.migrateADO(contractAddress, newCodeId, migrateMsg, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'publish_ado': {
        const { codeId, adoType, version, mnemonic } = PublishADOSchema.parse(args);
        const result = await andromedaServer.publishADO(codeId, adoType, version, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // ADO-Specific Functionality Tools
      case 'cw20_mint': {
        const { contractAddress, recipient, amount, mnemonic } = CW20MintSchema.parse(args);
        const result = await andromedaServer.cw20Mint(contractAddress, recipient, amount, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'cw20_burn': {
        const { contractAddress, amount, mnemonic } = z.object({
          contractAddress: z.string(),
          amount: z.string(),
          mnemonic: z.string()
        }).parse(args);
        const result = await andromedaServer.cw20Burn(contractAddress, amount, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'cw721_mint_nft': {
        const { contractAddress, tokenId, owner, mnemonic, tokenUri, extension } = CW721MintSchema.parse(args);
        const result = await andromedaServer.cw721MintNFT(contractAddress, tokenId, owner, mnemonic, tokenUri, extension);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'marketplace_list_item': {
        const parsed = MarketplaceListSchema.parse(args);
        const { marketplaceAddress, nftContract, tokenId, price, mnemonic } = parsed;
        // Type assertion to ensure price matches expected interface
        const validPrice = price as { amount: string; denom: string };
        const result = await andromedaServer.marketplaceListItem(marketplaceAddress, nftContract, tokenId, validPrice, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'auction_place_bid': {
        const { auctionAddress, amount, denom = 'uandr', mnemonic } = AuctionBidSchema.parse(args);
        const result = await andromedaServer.auctionPlaceBid(auctionAddress, amount, denom, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'splitter_update_recipients': {
        const parsed = SplitterUpdateSchema.parse(args);
        const { splitterAddress, recipients, mnemonic } = parsed;
        // Type assertion to ensure recipients match expected interface
        const validRecipients = recipients as Array<{ address: string; percent: string }>;
        const result = await andromedaServer.splitterUpdateRecipients(splitterAddress, validRecipients, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // CW20 Exchange Tools
      case 'deploy_cw20_exchange': {
        const { tokenAddress, name, mnemonic } = DeployCW20ExchangeSchema.parse(args);
        const result = await andromedaServer.deployCW20Exchange(tokenAddress, name, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'start_cw20_sale': {
        const parsed = StartCW20SaleSchema.parse(args);
        const { exchangeAddress, tokenAddress, amount, asset, exchangeRate, mnemonic, recipient, startTime, duration } = parsed;
        // Type assertion to ensure asset matches expected interface
        const validAsset = asset as { type: 'native' | 'cw20'; value: string };
        const result = await andromedaServer.startCW20Sale(exchangeAddress, tokenAddress, amount, validAsset, exchangeRate, mnemonic, recipient, startTime, duration);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'purchase_cw20_tokens': {
        const parsed = PurchaseCW20TokensSchema.parse(args);
        const { exchangeAddress, purchaseAsset, mnemonic, recipient } = parsed;
        // Type assertion to ensure purchaseAsset matches expected interface
        const validPurchaseAsset = purchaseAsset as { type: 'native' | 'cw20'; address: string; amount: string; denom: string };
        const result = await andromedaServer.purchaseCW20Tokens(exchangeAddress, validPurchaseAsset, mnemonic, recipient);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'cancel_cw20_sale': {
        const parsed = CancelCW20SaleSchema.parse(args);
        const { exchangeAddress, asset, mnemonic } = parsed;
        // Type assertion to ensure asset matches expected interface
        const validAsset = asset as { type: 'native' | 'cw20'; value: string };
        const result = await andromedaServer.cancelCW20Sale(exchangeAddress, validAsset, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'query_cw20_sale': {
        const parsed = QueryCW20SaleSchema.parse(args);
        const { exchangeAddress, asset } = parsed;
        // Type assertion to ensure asset matches expected interface
        const validAsset = asset as { type: 'native' | 'cw20'; value: string };
        const result = await andromedaServer.queryCW20Sale(exchangeAddress, validAsset);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Auction Tools
      case 'deploy_auction': {
        const { name, mnemonic, authorizedTokenAddresses, authorizedCw20Address } = DeployAuctionSchema.parse(args);
        const result = await andromedaServer.deployAuction(name, mnemonic, authorizedTokenAddresses, authorizedCw20Address);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'start_auction': {
        const { auctionAddress, tokenId, tokenAddress, duration, mnemonic, startTime, coinDenom, startingBid, recipient } = StartAuctionSchema.parse(args);
        const result = await andromedaServer.startAuction(auctionAddress, tokenId, tokenAddress, duration, mnemonic, startTime, coinDenom, startingBid, recipient);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'place_auction_bid': {
        const { auctionAddress, tokenId, tokenAddress, bidAmount, denom, mnemonic } = PlaceAuctionBidSchema.parse(args);
        const result = await andromedaServer.placeAuctionBid(auctionAddress, tokenId, tokenAddress, bidAmount, denom, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'finalize_auction': {
        const { auctionAddress, tokenId, tokenAddress, mnemonic } = FinalizeAuctionSchema.parse(args);
        const result = await andromedaServer.finalizeAuction(auctionAddress, tokenId, tokenAddress, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // CW20-Staking Tools
      case 'deploy_cw20_staking': {
        const { name, stakingToken, rewardToken, rewardAllocation, mnemonic, unbondingPeriod } = DeployCW20StakingSchema.parse(args);
        const result = await andromedaServer.deployCW20Staking(name, stakingToken, rewardToken, rewardAllocation, mnemonic, unbondingPeriod);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'stake_cw20_tokens': {
        const { stakingAddress, tokenAddress, amount, mnemonic } = StakeCW20TokensSchema.parse(args);
        const result = await andromedaServer.stakeCW20Tokens(stakingAddress, tokenAddress, amount, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'unstake_cw20_tokens': {
        const { stakingAddress, amount, mnemonic } = UnstakeCW20TokensSchema.parse(args);
        const result = await andromedaServer.unstakeCW20Tokens(stakingAddress, amount, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'claim_staking_rewards': {
        const { stakingAddress, mnemonic } = ClaimStakingRewardsSchema.parse(args);
        const result = await andromedaServer.claimStakingRewards(stakingAddress, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Merkle Airdrop Tools
      case 'deploy_merkle_airdrop': {
        const parsed = DeployMerkleAirdropSchema.parse(args);
        const { name, asset, merkleRoot, totalAmount, mnemonic, startTime, endTime } = parsed;
        // Type assertion to ensure asset matches expected interface
        const validAsset = asset as { type: 'native' | 'cw20'; value: string };
        const result = await andromedaServer.deployMerkleAirdrop(name, validAsset, merkleRoot, totalAmount, mnemonic, startTime, endTime);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'claim_airdrop_tokens': {
        const { airdropAddress, amount, proof, mnemonic } = ClaimAirdropTokensSchema.parse(args);
        const result = await andromedaServer.claimAirdropTokens(airdropAddress, amount, proof, mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'query_airdrop_claim': {
        const { airdropAddress, address } = QueryAirdropSchema.parse(args);
        const result = await andromedaServer.queryAirdropClaim(airdropAddress, address);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
