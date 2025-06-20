import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  // Blockchain Infrastructure Queries (6 tools)
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
  // Contract & Code Queries (5 tools)
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
  },  {
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

  // ADO Database Queries (3 tools)
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
  },  {
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

  // App Information Queries (2 tools)
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
  },  {
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

  // Exchange & Airdrop Status Queries (2 tools)
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
  },  {
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
