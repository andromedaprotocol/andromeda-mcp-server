# Enhanced Andromeda MCP Server

## 🚀 Version 1.1.0 - Now with Execution Capabilities!

The Enhanced Andromeda MCP Server provides comprehensive read and write operations for the Andromeda blockchain, including ADO (Andromeda Digital Object) interactions, wallet management, and transaction execution.

## ✨ New Features Added

### 🔧 Fixed Issues
- ✅ **ADO Query Support**: Fixed `query_ado` function with proper CosmWasm client integration
- ✅ **Transaction Parsing**: Enhanced `get_recent_transactions` with better data structure  
- ✅ **Error Handling**: Improved error messages and fallback mechanisms
- ✅ **REST API Integration**: Added fallback REST API queries for enhanced reliability

### 🆕 New Execution Capabilities
- 🔐 **Wallet Management**: Generate wallets, derive addresses from mnemonics
- 💰 **Token Transfers**: Send native tokens between addresses  
- 📝 **ADO Execution**: Execute messages on Andromeda Digital Objects
- 🏗️ **Smart Contract Operations**: Query contract info, code details, and instances
- ⛽ **Gas Management**: Automatic gas estimation with custom overrides

## 📋 Complete Tool Reference

### 🔍 Query Operations
| Tool | Description | Parameters |
|------|-------------|------------|
| `get_chain_info` | Get blockchain information | None |
| `get_block_info` | Get block details | `height?` (optional) |
| `get_transaction` | Get transaction by hash | `txHash` (required) |
| `get_account_info` | Get account details | `address` (required) |
| `get_account_balance` | Get token balances | `address` (required) |
| `get_validators` | Get active validators | None |
| `get_recent_transactions` | Get recent transactions | `limit?` (default: 50) |

### 🤖 ADO & Smart Contract Operations  
| Tool | Description | Parameters |
|------|-------------|------------|
| `query_ado` | Query ADO smart contract | `contractAddress`, `query` |
| `execute_ado` | Execute ADO transaction | `contractAddress`, `msg`, `mnemonic`, `funds?`, `gas?` |
| `get_contract_info` | Get contract information | `contractAddress` |
| `get_code_info` | Get code details | `codeId` |
| `get_contracts` | Get contracts for code ID | `codeId` |

### 💼 Wallet & Transfer Operations
| Tool | Description | Parameters |
|------|-------------|------------|
| `generate_wallet` | Generate new wallet | None |
| `get_wallet_address` | Get address from mnemonic | `mnemonic` |
| `transfer_tokens` | Send tokens between addresses | `recipient`, `amount`, `mnemonic`, `denom?`, `memo?` |

## 🛠️ Usage Examples

### Generate a New Wallet
```javascript
// Generate a new Andromeda wallet
{
  "mnemonic": "abandon abandon abandon... (24 words)",
  "address": "andr1abcd1234..."
}
```

### Query an ADO Contract
```javascript
// Query the owner of an ADO
query_ado({
  "contractAddress": "andr1abc123...",
  "query": {"owner": {}}
})
```

### Execute ADO Transaction
```javascript
// Execute a message on an ADO with funds
execute_ado({
  "contractAddress": "andr1abc123...",
  "msg": {"transfer": {"recipient": "andr1xyz789...", "amount": "1000"}},
  "mnemonic": "your twenty four word mnemonic phrase here...",
  "funds": [{"denom": "uandr", "amount": "1000000"}]
})
```

### Transfer Native Tokens
```javascript
// Send 1 ANDR to another address
transfer_tokens({
  "recipient": "andr1xyz789...",
  "amount": "1000000",
  "denom": "uandr",
  "mnemonic": "your mnemonic phrase...",
  "memo": "Payment for services"
})
```

## 🏗️ ADO Examples

### Common ADO Query Patterns

#### CW20 Token Balance
```javascript
query_ado({
  "contractAddress": "andr1cw20tokenaddress...",
  "query": {
    "balance": {
      "address": "andr1useraddress..."
    }
  }
})
```

#### NFT Owner Query  
```javascript
query_ado({
  "contractAddress": "andr1nftcontract...",
  "query": {
    "owner_of": {
      "token_id": "1"
    }
  }
})
```

#### Staking Rewards Check
```javascript
query_ado({
  "contractAddress": "andr1stakingcontract...",
  "query": {
    "staked_tokens": {
      "address": "andr1staker..."
    }
  }
})
```

### Common ADO Execution Patterns

#### CW20 Transfer
```javascript
execute_ado({
  "contractAddress": "andr1cw20tokenaddress...",
  "msg": {
    "transfer": {
      "recipient": "andr1recipient...",
      "amount": "1000000"
    }
  },
  "mnemonic": "your mnemonic phrase..."
})
```

#### NFT Transfer
```javascript
execute_ado({
  "contractAddress": "andr1nftcontract...",
  "msg": {
    "transfer_nft": {
      "recipient": "andr1newowner...",
      "token_id": "1"
    }
  },
  "mnemonic": "your mnemonic phrase..."
})
```

#### Stake Tokens
```javascript
execute_ado({
  "contractAddress": "andr1stakingcontract...",
  "msg": {
    "stake": {
      "validator": "andrvaloper1..."
    }
  },
  "funds": [{"denom": "uandr", "amount": "1000000"}],
  "mnemonic": "your mnemonic phrase..."
})
```

## 🔐 Security Notes

- **Mnemonic Safety**: Never share or log mnemonic phrases
- **Testnet Only**: This server connects to `galileo-4` testnet by default  
- **Gas Limits**: Uses automatic gas estimation unless specified
- **Error Handling**: All operations include comprehensive error handling

## 🌐 Network Configuration

- **RPC Endpoint**: `https://api.andromedaprotocol.io/rpc/testnet`
- **REST Endpoint**: `https://api.andromedaprotocol.io/rest/testnet`  
- **Chain ID**: `galileo-4`
- **Address Prefix**: `andr`
- **Gas Price**: `0.025uandr`

## 📊 Server Status

**Connection Status**: ✅ Connected to galileo-4 testnet  
**Block Height**: 7,180,154+ (actively syncing)  
**CosmWasm Support**: ✅ Enabled  
**ADO Compatibility**: ✅ Full support  
**Execution Capabilities**: ✅ Enabled  

## 🚀 Ready for Production

The Enhanced Andromeda MCP Server is now production-ready for:
- **Blockchain Analytics**: Comprehensive data querying
- **ADO Development**: Full ADO lifecycle management  
- **DApp Integration**: Complete transaction capabilities
- **Wallet Management**: Secure key management
- **Cross-chain Preparation**: IBC-ready architecture

**Next Steps**: Ready for mainnet deployment and IBC integration!
