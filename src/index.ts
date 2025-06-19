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
import * as schemas from './utils/validation.js';

// Setup BigInt serialization
setupBigIntSerialization();

// ============================================================================
// ANDROMEDA VIRTUAL TECHNICAL CO-FOUNDER
// ============================================================================

/**
 * ANDROMEDA VIRTUAL TECHNICAL CO-FOUNDER
 * 
 * This server presents as a virtual technical co-founder specializing in rapid business 
 * infrastructure deployment using Andromeda Digital Objects (ADOs).
 * 
 * The complete master prompt defining the co-founder's role, methodology, and interaction
 * patterns is configured in the MCP client configuration files (mcp.json or 
 * claude_desktop_config.json) under the "masterPrompt" field.
 * 
 * For the full prompt specification, see: MASTER-PROMPT.md
 */

// Initialize server
const server = new Server(
  {
    name: 'andromeda-mcp-server-testnet',
    version: '1.7.0',
    description: `Andromeda Virtual Technical Co-Founder

🤝 **Your Role**: Virtual technical co-founder specializing in rapid business infrastructure deployment using Andromeda Digital Objects (ADOs).

🎯 **Partnership Mission**: Transform business ideas into deployed, production-ready infrastructure using systematic ADO composition - delivering what typically takes months of development and multiple technical hires in a matter of hours.

⚡ **Core Partnership Value**: Strategic technical guidance + systematic deployment + business validation

🛠️ **Technical Toolkit**:
• **Core Infrastructure**: CW20 (tokens), CW721 (NFTs), Splitter (revenue distribution), Marketplace, Auction
• **DeFi & Financial**: CW20-Staking, CW20-Exchange, Merkle-Airdrop, Multi-sig
• **Advanced**: App (orchestration), Address-List (access control), Conditional-Splitter, Timelock

🏗️ **Co-Founder Architectures**:
• SaaS with Tokenized Subscriptions (CW20 + CW721 + Staking + Exchange)
• NFT Creator Platforms (CW721 + Marketplace + Auction + Revenue sharing)  
• Supply Chain SaaS (Product certificates + Verification rewards + Trading)
• DeFi Protocols (Lending + Yield farming + Liquidity pools)
• Token Economies (Governance + Staking + Exchange + Community rewards)

🚀 **Strategic Deployment Approach**:
1. **Foundation Layer** → Company infrastructure (tokens & NFTs)
2. **Financial Layer** → Business operations (splitters, staking, exchanges)  
3. **Application Layer** → Customer-facing products (marketplaces, auctions)
4. **Business Validation** → End-to-end workflow testing

💼 **Partnership Benefits**: 
⚡ Speed (hours vs months) • 💰 Cost efficiency (fraction of technical team) • 🔍 Transparency (immutable business logic) • 🔧 Composability (proven components) • 🏗️ Production-ready • 🚀 Scalable architecture

Ready to be your technical co-founder and build the infrastructure that enables your business vision.`
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
        const { height } = schemas.BlockHeightSchema.parse(args);
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
        const { txHash } = schemas.TransactionSchema.parse(args);
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
        const { address } = schemas.AddressSchema.parse(args);
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
        const { address } = schemas.AddressSchema.parse(args);
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
        const { contractAddress, query } = schemas.ADOQuerySchema.parse(args);
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
        const { contractAddress, msg, mnemonic, funds, gas } = schemas.ADOExecuteSchema.parse(args);
        const result = await andromedaServer.executeADO(contractAddress, msg, mnemonic, funds as { denom: string; amount: string; }[] | undefined, gas);
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
        const { recipient, amount, denom, mnemonic, memo } = schemas.TransferSchema.parse(args);
        // 🔍 DEBUG: Trace mnemonic after schema parsing
        console.error(`🔍 TRANSFER_TOKENS INDEX DEBUG - Schema parsed mnemonic words: ${mnemonic.split(' ').length}, First: "${mnemonic.split(' ')[0]}"`);
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
        const { mnemonic } = schemas.WalletSchema.parse(args);
        // 🔍 DEBUG: Trace mnemonic after schema parsing (WORKING FUNCTION)
        console.error(`🔍 GET_WALLET_ADDRESS INDEX DEBUG (WORKING) - Schema parsed mnemonic words: ${mnemonic.split(' ').length}, First: "${mnemonic.split(' ')[0]}"`);
        const result = await andromedaServer.getWalletAddress(mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ address: result }, null, 2),
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
        const { limit } = args as { limit?: number };
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
        const { address: contractAddress } = schemas.AddressSchema.parse(args);
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
        const { codeId } = args as { codeId: number };
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
        const { codeId } = args as { codeId: number };
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

      case 'query_adodb': {
        const { adoType, startAfter } = schemas.ADODBQuerySchema.parse(args);
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
        const { adoType, version } = schemas.ADOCodeIdSchema.parse(args);
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
        const { adoType } = schemas.ADOCodeIdSchema.parse(args);
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

      case 'graphql_query': {
        const { query, variables } = schemas.GraphQLQuerySchema.parse(args);
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
        const { address: contractAddress } = schemas.AddressSchema.parse(args);
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

      case 'create_app': {
        const { name, components, mnemonic } = schemas.CreateAppSchema.parse(args);
        const result = await andromedaServer.createApp(name, components as { name: string; ado_type: string; component_type: any; }[], mnemonic);
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
        const { appAddress } = schemas.AppInfoSchema.parse(args);
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
        const { appAddress } = schemas.AppInfoSchema.parse(args);
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
        const { appAddress, updates, mnemonic } = args as any;
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

      case 'deploy_ado': {
        const { adoType, name, instantiateMsg, mnemonic, codeId } = schemas.DeployADOSchema.parse(args);
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
        const { codeId, instantiateMsg, label, mnemonic } = args as any;
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
        const { contractAddress, newCodeId, migrateMsg, mnemonic } = schemas.MigrateADOSchema.parse(args);
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
        const { codeId, adoType, version, mnemonic } = schemas.PublishADOSchema.parse(args);
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

      case 'cw20_mint': {
        const { contractAddress, recipient, amount, mnemonic } = schemas.CW20MintSchema.parse(args);
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
        const { contractAddress, amount, mnemonic } = args as any;
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
        const { contractAddress, tokenId, owner, mnemonic, tokenUri, extension } = schemas.CW721MintSchema.parse(args);
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
        const { marketplaceAddress, nftContract, tokenId, price, mnemonic } = schemas.MarketplaceListSchema.parse(args);
        const result = await andromedaServer.marketplaceListItem(marketplaceAddress, nftContract, tokenId, price as { amount: string; denom: string; }, mnemonic);
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
        const { auctionAddress, amount, denom, mnemonic } = schemas.AuctionBidSchema.parse(args);
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
        const { splitterAddress, recipients, mnemonic } = schemas.SplitterUpdateSchema.parse(args);
        const result = await andromedaServer.splitterUpdateRecipients(splitterAddress, recipients as { address: string; percent: string; }[], mnemonic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // CW20 Exchange operations
      case 'deploy_cw20_exchange': {
        const { tokenAddress, name, mnemonic } = schemas.DeployCW20ExchangeSchema.parse(args);
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
        const { exchangeAddress, tokenAddress, amount, asset, exchangeRate, mnemonic, recipient, startTime, duration } = schemas.StartCW20SaleSchema.parse(args);
        const result = await andromedaServer.startCW20Sale(exchangeAddress, tokenAddress, amount, asset as { type: "cw20" | "native"; value: string; }, exchangeRate, mnemonic, recipient, startTime, duration);
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
        const { exchangeAddress, purchaseAsset, mnemonic, recipient } = schemas.PurchaseCW20TokensSchema.parse(args);
        const result = await andromedaServer.purchaseCW20Tokens(exchangeAddress, purchaseAsset as { type: "cw20" | "native"; address: string; amount: string; denom: string; }, mnemonic, recipient);
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
        const { exchangeAddress, asset, mnemonic } = schemas.CancelCW20SaleSchema.parse(args);
        const result = await andromedaServer.cancelCW20Sale(exchangeAddress, asset as { type: "cw20" | "native"; value: string; }, mnemonic);
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
        const { exchangeAddress, asset } = schemas.QueryCW20SaleSchema.parse(args);
        const result = await andromedaServer.queryCW20Sale(exchangeAddress, asset as { type: "cw20" | "native"; value: string; });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Auction operations
      case 'deploy_auction': {
        const { name, authorizedTokenAddresses, authorizedCw20Address, mnemonic } = schemas.DeployAuctionSchema.parse(args);
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
        const { auctionAddress, tokenId, tokenAddress, startTime, duration, coinDenom, startingBid, recipient, mnemonic } = schemas.StartAuctionSchema.parse(args);
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
        const { auctionAddress, tokenId, tokenAddress, bidAmount, denom, mnemonic } = schemas.PlaceAuctionBidSchema.parse(args);
        // 🔍 DEBUG: Trace mnemonic after schema parsing
        console.error(`🔍 PLACE_AUCTION_BID INDEX DEBUG - Schema parsed mnemonic words: ${mnemonic.split(' ').length}, First: "${mnemonic.split(' ')[0]}"`);
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
        const { auctionAddress, tokenId, tokenAddress, mnemonic } = schemas.FinalizeAuctionSchema.parse(args);
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

      // CW20-Staking operations
      case 'deploy_cw20_staking': {
        const { name, stakingToken, rewardToken, rewardAllocation, mnemonic, unbondingPeriod } = schemas.DeployCW20StakingSchema.parse(args);
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
        const { stakingAddress, tokenAddress, amount, mnemonic } = schemas.StakeCW20TokensSchema.parse(args);
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
        const { stakingAddress, amount, mnemonic } = schemas.UnstakeCW20TokensSchema.parse(args);
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
        const { stakingAddress, mnemonic } = schemas.ClaimStakingRewardsSchema.parse(args);
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

      // Merkle Airdrop operations
      case 'deploy_merkle_airdrop': {
        const { name, asset, merkleRoot, totalAmount, mnemonic, startTime, endTime } = schemas.DeployMerkleAirdropSchema.parse(args);
        const result = await andromedaServer.deployMerkleAirdrop(name, asset as { type: "cw20" | "native"; value: string; }, merkleRoot, totalAmount, mnemonic, startTime, endTime);
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
        const { airdropAddress, amount, proof, mnemonic } = schemas.ClaimAirdropTokensSchema.parse(args);
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
        const { airdropAddress, address } = schemas.QueryAirdropSchema.parse(args);
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