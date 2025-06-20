import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

// Import the new modular components
import { setupBigIntSerialization } from './utils/serialization.js';
import { AndromedaMCPServer } from './server.js';
import { tools } from './tools.js';

// Setup BigInt serialization
setupBigIntSerialization();

// Initialize server
const server = new Server(
  {
    name: 'andromeda-mcp-queries',
    version: '1.0.0',
    description: 'Andromeda MCP Server - Queries Package: 16 read-only tools for safe blockchain exploration'
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

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Blockchain Infrastructure Queries (6 tools)
      case 'get_chain_info': {
        const result = await andromedaServer.getChainInfo();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_block_info': {
        const result = await andromedaServer.getBlockInfo(args?.height as number);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_account_info': {
        const result = await andromedaServer.getAccountInfo(args?.address as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_account_balance': {
        const result = await andromedaServer.getAccountBalance(args?.address as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_validators': {
        const result = await andromedaServer.getValidators();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_recent_transactions': {
        const result = await andromedaServer.getRecentTransactions(args?.limit as number);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // Contract & Code Queries (5 tools)
      case 'query_ado': {
        const result = await andromedaServer.queryADO(args?.contractAddress as string, args?.query as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_contract_info': {
        const result = await andromedaServer.getContractInfo(args?.contractAddress as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_code_info': {
        const result = await andromedaServer.getCodeInfo(args?.codeId as number);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_contracts': {
        const result = await andromedaServer.getContracts(args?.codeId as number);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_transaction': {
        const result = await andromedaServer.getTransaction(args?.txHash as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // ADO Database Queries (3 tools)
      case 'query_adodb': {
        const result = await andromedaServer.queryADODB(args?.adoType as string, args?.startAfter as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_ado_code_id': {
        const result = await andromedaServer.getADOCodeId(args?.adoType as string, args?.version as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'list_ado_versions': {
        const result = await andromedaServer.listADOVersions(args?.adoType as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // App Information Queries (2 tools)  
      case 'get_app_info': {
        const result = await andromedaServer.getAppInfo(args?.appAddress as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'list_app_components': {
        const result = await andromedaServer.listAppComponents(args?.appAddress as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // Exchange & Airdrop Status Queries (2 tools)
      case 'query_cw20_sale': {
        const result = await andromedaServer.queryCW20Sale(args?.exchangeAddress as string, args?.asset as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'query_airdrop_claim': {
        const result = await andromedaServer.queryAirdropClaim(args?.airdropAddress as string, args?.address as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // Advanced Monitoring (2 tools)
      case 'graphql_query': {
        const result = await andromedaServer.graphqlQuery(args?.query as string, args?.variables as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'subscribe_ado_events': {
        const result = await andromedaServer.subscribeADOEvents(args?.contractAddress as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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
  console.error('Andromeda MCP Queries Server running on stdio');
}

main().catch(console.error);
