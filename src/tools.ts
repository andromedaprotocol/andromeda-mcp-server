import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Note: Validation schemas are not currently used in tool definitions
// but are available for future use from utils/validation.ts
// import * as validationSchemas from './utils/validation.js';

export const tools: Tool[] = [
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
    description: 'Generate a new Andromeda wallet with mnemonic phrase',
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
              component_type: { type: 'object' }
            },
            required: ['name', 'ado_type', 'component_type']
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