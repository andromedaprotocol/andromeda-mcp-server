# Andromeda MCP Server

**16 Read-Only Query Tools** | **Safe Blockchain Exploration**

🔍 **COMPREHENSIVE BLOCKCHAIN DISCOVERY** without transaction risk.

*The first MCP server in the Cosmos ecosystem, bringing Andromeda's complete ADO framework to AI agents.*

## 🎯 Overview

The Andromeda MCP Server provides **16 powerful read-only tools** for comprehensive Andromeda blockchain exploration, monitoring, and discovery. Perfect for developers, analysts, and researchers who need deep blockchain insights without transaction capabilities.

## ✨ Key Features

### 🔒 **100% Safe**
- **No transaction capabilities** - pure read-only operations
- **Risk-free exploration** of contracts and blockchain state
- **Perfect for production analytics** without security concerns

### 📊 **Comprehensive Coverage**
- **Blockchain Infrastructure**: Chain info, blocks, accounts, validators
- **Contract Discovery**: ADO queries, contract inspection, code analysis  
- **ADO Database**: Type discovery, version management, code resolution
- **Status Monitoring**: Exchange queries and airdrop claim status

### ⚡ **Production Ready**
- Built on **98% functional** Andromeda MCP infrastructure
- **Battle-tested** query operations from full ecosystem
- **Optimized performance** for analytics workloads

## 🛠 Installation

```bash
npm install @andromedaprotocol/andromeda-mcp-queries
```

## 🚀 Quick Start

### MCP Configuration

Add to your MCP configuration file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "andromeda-queries": {
      "command": "npx",
      "args": ["@andromedaprotocol/andromeda-mcp-queries"],
      "env": {
        "ANDROMEDA_NETWORK": "testnet"
      }
    }
  }
}
```

### Environment Variables

- `ANDROMEDA_NETWORK`: Set to `testnet` or `mainnet` (default: `testnet`)

## 📋 Available Tools

### 🌐 Blockchain Infrastructure (6 tools)

| Tool | Description |
|------|-------------|
| `get_chain_info` | Get basic information about the Andromeda blockchain |
| `get_block_info` | Get information about a specific block or the latest block |
| `get_account_info` | Get account information for an Andromeda address |
| `get_account_balance` | Get token balances for an Andromeda address |
| `get_validators` | Get list of active validators on Andromeda |
| `get_recent_transactions` | Get recent transactions on the Andromeda blockchain |

### 🔍 Contract & Code Discovery (5 tools)

| Tool | Description |
|------|-------------|
| `query_ado` | Query an Andromeda Digital Object (ADO) smart contract |
| `get_contract_info` | Get information about a CosmWasm smart contract |
| `get_code_info` | Get information about a CosmWasm code |
| `get_contracts` | Get all contracts for a specific code ID |
| `get_transaction` | Get details of a specific transaction by hash |

### 📚 ADO Database (3 tools)

| Tool | Description |
|------|-------------|
| `query_adodb` | Query the ADO Database for available ADO types |
| `get_ado_code_id` | Get code ID for specific ADO type and version |
| `list_ado_versions` | List all versions of a specific ADO type |

### 📈 **Status Queries (2 tools)**

| Tool | Description |
|------|-------------|
| `query_cw20_sale` | Query information about a CW20 sale on an exchange |
| `query_airdrop_claim` | Query airdrop claim status for an address |

## 🚀 Sample Prompts - Get Started Immediately!

Once installed, try these powerful prompts to explore Andromeda's capabilities:

### 🔍 **Blockchain Discovery**
```
Get the current state of the Andromeda blockchain - what's the latest block and chain info?
```

```
Show me the balance and account details for andr16lj28n4claa3kkplxmr8mt5jue3973dgzujfmq
```

```
Who are the active validators on Andromeda and what's their status?
```

### 📊 **ADO Ecosystem Exploration**
```
What ADO types are available in the Andromeda ecosystem? Show me all the building blocks I can use.
```

```
Get the code ID for the latest CW20 token ADO and show me all available versions.
```

```
Find all deployed contracts that use CW20 code ID 10 - show me the ecosystem of tokens.
```

### 🏗 **Smart Contract Analysis**
```
Query this Board Demo Token contract andr1wdfe5qqyq36mm7sqypcxnme2m47xtfgv7y8v7rtstxdxsj82rrtq7rrdzn and tell me its token info, total supply, and any other details.
```


### 🕵️ **Transaction Forensics**
```
Investigate this transaction 524AB9BE8429A4DEF0ECD3986C46C73BE32F4CE573BF44490DA42AA8EBFD5473 - what happened, who was involved, and what were the results?
```

### 💼 **Business Intelligence**
```
I'm thinking of building a DeFi application. Show me what CW20 staking and exchange ADOs are available, their versions, and get me the code IDs I'd need.
```


### 🎯 **Developer Workflows**
```
I want to deploy a marketplace. Show me the latest marketplace ADO code ID, find some example marketplace contracts, and query one to see how it's configured.
```

```
Walk me through the complete tokenomics landscape on Andromeda - what token ADOs exist, show me some live examples, and analyze their configurations.
```

**💡 Pro Tips:**
- Ask follow-up questions! Each query opens up new exploration paths
- Combine multiple tools in one prompt for comprehensive analysis
- Request analysis: "What does this contract data tell us about the project?"
- Use real addresses for concrete results (examples provided above)

## 🔍 Example Usage

### Basic Chain Exploration
```javascript
// Get current chain information
await get_chain_info()

// Check account balance
await get_account_balance({
  address: "andr1..."
})

// Query latest block
await get_block_info()
```

### ADO Discovery
```javascript
// Discover available ADO types
await query_adodb()

// Get code ID for specific ADO
await get_ado_code_id({
  adoType: "cw721",
  version: "latest"
})

// List all versions
await list_ado_versions({
  adoType: "marketplace"
})
```

### Contract Analysis
```javascript
// Query contract state
await query_ado({
  contractAddress: "andr1...",
  query: { "owner": {} }
})

// Get contract information
await get_contract_info({
  contractAddress: "andr1..."
})
```

### Advanced Monitoring
```javascript
// Execute custom GraphQL queries
await graphql_query({
  query: `
    query {
      chains {
        chainId
        chainName
      }
    }
  `
})

// Monitor contract events
await subscribe_ado_events({
  contractAddress: "andr1..."
})
```

## 📊 Use Cases

### 🔬 **Blockchain Analytics**
- Account monitoring and balance tracking
- Transaction analysis and chain exploration
- Validator performance monitoring

### 🏗 **Developer Tools**
- Contract discovery and inspection
- ADO type exploration and version management
- Code ID resolution for deployments

### 📈 **Business Intelligence**
- Market data via exchange queries
- Status monitoring and analytics

### 🎓 **Education & Research**
- Safe blockchain exploration for learning
- Contract interaction research
- Andromeda ecosystem discovery

## 🛡 Security & Safety

- **No Private Keys Required**: All operations are read-only
- **No Transaction Risk**: Cannot modify blockchain state
- **Production Safe**: Perfect for analytics in production environments
- **Rate Limit Friendly**: Efficient queries designed for high-frequency use

## 🔧 Development

### Local Development
```bash
git clone https://github.com/andromedaprotocol/Andromeda-MCP-Server.git
cd Andromeda-MCP-Server/package-1-queries
npm install
npm run dev
```

### Testing
```bash
npm test
```

### Building
```bash
npm run build
```

## 📚 Documentation

- **Tool Reference**: See inline tool descriptions for detailed parameters
- **GraphQL Schema**: Explore available queries via `graphql_query` tool
- **ADO Types**: Discover all available ADOs via `query_adodb`

## 🚀 What's Next?

This is **Package 1** of our 3-package rollout strategy:

- ✅ **Package 1 (This)**: 16 query-only tools for safe exploration
- ⏳ **Package 2**: Execution capabilities (~25 tools)
- ⏳ **Package 3**: Complete ecosystem (50 tools)

## 🤝 Support

- **Author**: Myron Koch (myronkoch@gmail.com)
- **Company**: Andromeda Protocol
- **License**: MIT
- **Issues**: GitHub Issues in main repository

## 🔗 Demo Wallet & Test Assets

**Demo Wallet**: `andr16lj28n4claa3kkplxmr8mt5jue3973dgzujfmq`
- **ANDR Balance**: ~10 ANDR for transaction fees
- **BDT Tokens**: 50,000 Board Demo Tokens  
- **NFT**: DEMO_001 from Demo Collection NFTs
- **Created**: Specifically for sample prompt testing

**Associated Contracts**:
- **Demo NFT Collection**: `andr1j6m8dplacngaagpd9vlxmj2xl0mt5lr7s56c92rfu2hk6e9rk88s5zaccf`
- **Board Demo Token**: `andr1wdfe5qqyq36mm7sqypcxnme2m47xtfgv7y8v7rtstxdxsj82rrtq7rrdzn`
- **App Contract**: `andr1wummgmrf39p2hg90yxn0uh3tvc630kez4e9ymz8ujny6zeklkxkq008jns`
- **Sample Transaction**: `58CF8D0D5B406EF714E62578D73F56C8F1CD04BA31BE0E05939F19F7E4F02781`

Perfect for copy-paste testing of all query tools with guaranteed interesting results!

## 📜 License

MIT License - See LICENSE file for details.

---

**🎯 Perfect for safe Andromeda blockchain exploration and discovery.**
