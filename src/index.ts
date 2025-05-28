#!/usr/bin/env node

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
BigInt.prototype.toJSON = function () { return this.toString(); };

// Configuration
const ANDROMEDA_RPC_ENDPOINT = process.env.ANDROMEDA_RPC_ENDPOINT || 'https://api.andromedaprotocol.io/rpc/testnet';
const ANDROMEDA_REST_ENDPOINT = process.env.ANDROMEDA_REST_ENDPOINT || 'https://api.andromedaprotocol.io/rest/testnet';
const ANDROMEDA_GRAPHQL_ENDPOINT = process.env.ANDROMEDA_GRAPHQL_ENDPOINT || 'https://api.andromedaprotocol.io/graphql/testnet';
const KERNEL_ADDRESS = 'andr14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9shptkql';
const DEFAULT_GAS_PRICE = GasPrice.fromString('0.025uandr');

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
  tokenUri: z.string().optional().describe('Token metadata URI'),
  extension: z.record(z.any()).optional().describe('Extension metadata'),
  mnemonic: z.string().describe('Minter wallet mnemonic')
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

    const fee = gas ? {
      amount: [{ denom: 'uandr', amount: '0' }],
      gas: gas,
    } : 'auto';

    const result = await signingClient.execute(
      senderAddress,
      contractAddress,
      msg,
      fee,
      undefined, // memo
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
      'auto',
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
    if (!this.cosmWasmClient) throw new Error('CosmWasm client not initialized');
    return await this.cosmWasmClient.getCodeDetails(codeId);
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

    const latestBlock = await this.cosmosClient.getBlock();
    const rawTxs = latestBlock.txs || [];

    // Parse the transactions to extract readable data
    const parsedTxs = rawTxs.slice(0, limit).map((tx, index) => {
      try {
        // Basic transaction structure
        return {
          index,
          raw_size: tx.length,
          block_height: latestBlock.header.height,
          block_time: latestBlock.header.time,
          // Note: Full parsing would require proper protobuf decoding
          // For now, we return the raw data with metadata
          raw_data: tx
        };
      } catch (error) {
        return {
          index,
          error: 'Failed to parse transaction',
          raw_size: tx.length
        };
      }
    });

    return parsedTxs;
  }

  // ADODB (ADO Database) Methods
  async queryADODB(adoType?: string, startAfter?: string): Promise<any> {
    try {
      // Query the ADODB through the kernel contract
      const query = {
        ado_list: {
          ado_type: adoType,
          start_after: startAfter,
          limit: 50
        }
      };
      
      // First, get the ADODB address from kernel
      const kernelQuery = { key_address: { key: "adodb" } };
      const kernelResult = await this.queryADO(KERNEL_ADDRESS, kernelQuery);
      const adobAddress = kernelResult.address;
      
      // Then query the ADODB
      return await this.queryADO(adobAddress, query);
    } catch (error) {
      // Fallback to a direct query if kernel method fails
      throw new Error(`Failed to query ADODB: ${error}`);
    }
  }

  async getADOCodeId(adoType: string, version?: string): Promise<any> {
    try {
      // Get ADODB address from kernel
      const kernelQuery = { key_address: { key: "adodb" } };
      const kernelResult = await this.queryADO(KERNEL_ADDRESS, kernelQuery);
      const adobAddress = kernelResult.address;
      
      // Query specific ADO type
      const query = {
        ado_type: {
          ado_type: adoType
        }
      };
      
      const result = await this.queryADO(adobAddress, query);
      
      if (version && result.ado_versions) {
        // Find specific version
        const versionInfo = result.ado_versions.find((v: any) => v.version === version);
        return versionInfo || { error: `Version ${version} not found for ADO type ${adoType}` };
      }
      
      // Return latest version info
      return result;
    } catch (error) {
      throw new Error(`Failed to get ADO code ID: ${error}`);
    }
  }

  async listADOVersions(adoType: string): Promise<any> {
    try {
      // Get ADODB address from kernel
      const kernelQuery = { key_address: { key: "adodb" } };
      const kernelResult = await this.queryADO(KERNEL_ADDRESS, kernelQuery);
      const adobAddress = kernelResult.address;
      
      // Query all versions for the ADO type
      const query = {
        ado_versions: {
          ado_type: adoType
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

    // Get App code ID from ADODB
    const appCodeId = await this.getADOCodeId('app');
    
    // Prepare App instantiation message
    const instantiateMsg = {
      app_components: components,
      name,
      kernel_address: KERNEL_ADDRESS
    };

    const result = await signingClient.instantiate(
      senderAddress,
      appCodeId.code_id,
      instantiateMsg,
      `${name} App`,
      'auto'
    );

    return result;
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
    if (!codeId) {
      const adoInfo = await this.getADOCodeId(adoType);
      codeId = adoInfo.code_id;
    }

    // Add kernel address to instantiate message
    const fullMsg = {
      ...instantiateMsg,
      kernel_address: KERNEL_ADDRESS
    };

    const result = await signingClient.instantiate(
      senderAddress,
      codeId,
      fullMsg,
      name,
      'auto'
    );

    return result;
  }

  async instantiateADO(
    codeId: number,
    instantiateMsg: any,
    label: string,
    mnemonic: string
  ): Promise<any> {
    const signingClient = await this.getSigningClient(mnemonic);
    const senderAddress = await this.getWalletAddress(mnemonic);

    const result = await signingClient.instantiate(
      senderAddress,
      codeId,
      instantiateMsg,
      label,
      'auto'
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
      'auto'
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
    tokenUri?: string,
    extension?: any,
    mnemonic?: string
  ): Promise<any> {
    const msg = {
      mint: {
        token_id: tokenId,
        owner,
        token_uri: tokenUri,
        extension
      }
    };
    
    return await this.executeADO(contractAddress, msg, mnemonic!);
  }

  async marketplaceListItem(
    marketplaceAddress: string,
    nftContract: string,
    tokenId: string,
    price: { amount: string; denom: string },
    mnemonic: string
  ): Promise<any> {
    // First, approve the marketplace to transfer the NFT
    const approveMsg = {
      approve: {
        spender: marketplaceAddress,
        token_id: tokenId
      }
    };
    
    await this.executeADO(nftContract, approveMsg, mnemonic);

    // Then list the item
    const listMsg = {
      receive_nft: {
        sender: await this.getWalletAddress(mnemonic),
        token_id: tokenId,
        msg: Buffer.from(JSON.stringify({
          list_item: {
            price
          }
        })).toString('base64')
      }
    };
    
    return await this.executeADO(marketplaceAddress, listMsg, mnemonic);
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
}

// Initialize server
const server = new Server(
  {
    name: 'andromeda-mcp-server',
    version: '1.2.0',
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
        tokenUri: {
          type: 'string',
          description: 'Token metadata URI',
        },
        extension: {
          type: 'object',
          description: 'Extension metadata',
        },
        mnemonic: {
          type: 'string',
          description: 'Minter wallet mnemonic',
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
        const { contractAddress, msg, mnemonic, funds, gas } = ADOExecuteSchema.parse(args);
        const result = await andromedaServer.executeADO(contractAddress, msg, mnemonic, funds, gas);
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
        const { limit = 50 } = args as any;
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
        const { contractAddress } = AddressSchema.parse(args);
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
        const { contractAddress } = AddressSchema.parse(args);
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
