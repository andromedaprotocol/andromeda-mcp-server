import { z } from 'zod';

// Input validation schemas
export const BlockHeightSchema = z.object({
  height: z.number().optional().describe('Block height to query (latest if not specified)')
});

export const TransactionSchema = z.object({
  txHash: z.string().describe('Transaction hash to query')
});

export const AddressSchema = z.object({
  address: z.string().describe('Andromeda address to query')
});

export const ADOQuerySchema = z.object({
  contractAddress: z.string().describe('ADO contract address'),
  query: z.record(z.any()).describe('Query message to send to ADO')
});

export const ADOExecuteSchema = z.object({
  contractAddress: z.string().describe('ADO contract address'),
  msg: z.record(z.any()).describe('Execute message to send to ADO'),
  funds: z.array(z.object({
    denom: z.string(),
    amount: z.string()
  })).optional().describe('Funds to send with execution'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction'),
  gas: z.string().optional().describe('Gas limit (default: auto)')
});

export const WalletSchema = z.object({
  mnemonic: z.string().describe('BIP-39 mnemonic phrase for wallet generation')
});

export const TransferSchema = z.object({
  recipient: z.string().describe('Recipient address'),
  amount: z.string().describe('Amount to transfer'),
  denom: z.string().default('uandr').describe('Token denomination'),
  mnemonic: z.string().describe('Sender wallet mnemonic'),
  memo: z.string().optional().describe('Transaction memo')
});

export const DateRangeSchema = z.object({
  startDate: z.string().optional().describe('Start date (ISO string)'),
  endDate: z.string().optional().describe('End date (ISO string)'),
  limit: z.number().default(100).describe('Maximum number of results')
});

export const ADODBQuerySchema = z.object({
  adoType: z.string().optional().describe('ADO type to query'),
  startAfter: z.string().optional().describe('Pagination start after')
});

export const ADOCodeIdSchema = z.object({
  adoType: z.string().describe('ADO type to get code ID for'),
  version: z.string().optional().describe('Specific version (latest if not specified)')
});

export const GraphQLQuerySchema = z.object({
  query: z.string().describe('GraphQL query string'),
  variables: z.record(z.any()).optional().describe('GraphQL variables')
});

export const CreateAppSchema = z.object({
  name: z.string().describe('Name of the App'),
  components: z.array(z.object({
    name: z.string(),
    ado_type: z.string(),
    component_type: z.record(z.any())
  })).describe('ADO components to include in the App'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction')
});

export const AppInfoSchema = z.object({
  appAddress: z.string().describe('App contract address')
});

export const DeployADOSchema = z.object({
  adoType: z.string().describe('Type of ADO to deploy'),
  name: z.string().describe('Name for the ADO instance'),
  instantiateMsg: z.record(z.any()).describe('Instantiation message'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction'),
  codeId: z.number().optional().describe('Code ID (will fetch from ADODB if not provided)')
});

export const MigrateADOSchema = z.object({
  contractAddress: z.string().describe('ADO contract address to migrate'),
  newCodeId: z.number().describe('New code ID to migrate to'),
  migrateMsg: z.record(z.any()).describe('Migration message'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction')
});

export const PublishADOSchema = z.object({
  codeId: z.number().describe('Code ID to publish'),
  adoType: z.string().describe('ADO type name'),
  version: z.string().describe('Version number'),
  mnemonic: z.string().describe('Publisher wallet mnemonic')
});

export const CW20MintSchema = z.object({
  contractAddress: z.string().describe('CW20 contract address'),
  recipient: z.string().describe('Recipient address'),
  amount: z.string().describe('Amount to mint'),
  mnemonic: z.string().describe('Minter wallet mnemonic')
});

export const CW721MintSchema = z.object({
  contractAddress: z.string().describe('CW721 contract address'),
  tokenId: z.string().describe('NFT token ID'),
  owner: z.string().describe('NFT owner address'),
  mnemonic: z.string().describe('Minter wallet mnemonic'),
  tokenUri: z.string().optional().describe('Token metadata URI'),
  extension: z.record(z.any()).optional().describe('Extension metadata'),
});

export const MarketplaceListSchema = z.object({
  marketplaceAddress: z.string().describe('Marketplace contract address'),
  nftContract: z.string().describe('NFT contract address'),
  tokenId: z.string().describe('NFT token ID'),
  price: z.object({
    amount: z.string(),
    denom: z.string()
  }).describe('Listing price'),
  mnemonic: z.string().describe('Seller wallet mnemonic')
});

export const AuctionBidSchema = z.object({
  auctionAddress: z.string().describe('Auction contract address'),
  amount: z.string().describe('Bid amount'),
  denom: z.string().default('uandr').describe('Token denomination'),
  mnemonic: z.string().describe('Bidder wallet mnemonic')
});

export const SplitterUpdateSchema = z.object({
  splitterAddress: z.string().describe('Splitter contract address'),
  recipients: z.array(z.object({
    address: z.string(),
    percent: z.string()
  })).describe('New recipient configuration'),
  mnemonic: z.string().describe('Admin wallet mnemonic')
});

// CW20 Exchange Schemas
export const DeployCW20ExchangeSchema = z.object({
  tokenAddress: z.string().describe('CW20 token contract address to create exchange for'),
  name: z.string().describe('Name for the CW20 Exchange instance'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction')
});

export const StartCW20SaleSchema = z.object({
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

export const PurchaseCW20TokensSchema = z.object({
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

export const CancelCW20SaleSchema = z.object({
  exchangeAddress: z.string().describe('CW20 Exchange contract address'),
  asset: z.object({
    type: z.enum(['native', 'cw20']),
    value: z.string()
  }).describe('Asset of the sale to cancel'),
  mnemonic: z.string().describe('Exchange owner wallet mnemonic')
});

export const QueryCW20SaleSchema = z.object({
  exchangeAddress: z.string().describe('CW20 Exchange contract address'),
  asset: z.object({
    type: z.enum(['native', 'cw20']),
    value: z.string()
  }).describe('Asset of the sale to query')
});

// Auction Schemas
export const DeployAuctionSchema = z.object({
  name: z.string().describe('Name for the Auction instance'),
  authorizedTokenAddresses: z.array(z.string()).optional().describe('Authorized NFT contract addresses'),
  authorizedCw20Address: z.string().optional().describe('Authorized CW20 payment token address'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction')
});

export const StartAuctionSchema = z.object({
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

export const PlaceAuctionBidSchema = z.object({
  auctionAddress: z.string().describe('Auction contract address'),
  tokenId: z.string().describe('NFT token ID being auctioned'),
  tokenAddress: z.string().describe('NFT contract address'),
  bidAmount: z.string().describe('Bid amount'),
  denom: z.string().default('uandr').describe('Token denomination'),
  mnemonic: z.string().describe('Bidder wallet mnemonic')
});

export const FinalizeAuctionSchema = z.object({
  auctionAddress: z.string().describe('Auction contract address'),
  tokenId: z.string().describe('NFT token ID being auctioned'),
  tokenAddress: z.string().describe('NFT contract address'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction')
});

// CW20-Staking Schemas (DeFi-focused)
export const DeployCW20StakingSchema = z.object({
  name: z.string().describe('Name for the CW20-Staking instance'),
  stakingToken: z.string().describe('CW20 token contract address for staking'),
  rewardToken: z.string().describe('CW20 token contract address for rewards'),
  rewardAllocation: z.string().describe('Reward allocation for the reward token'),
  mnemonic: z.string().describe('Wallet mnemonic for signing transaction'),
  unbondingPeriod: z.number().optional().describe('Unbonding period in seconds (optional)')
});

export const StakeCW20TokensSchema = z.object({
  stakingAddress: z.string().describe('CW20-Staking contract address'),
  tokenAddress: z.string().describe('CW20 token contract address to stake'),
  amount: z.string().describe('Amount of tokens to stake'),
  mnemonic: z.string().describe('Staker wallet mnemonic')
});

export const UnstakeCW20TokensSchema = z.object({
  stakingAddress: z.string().describe('CW20-Staking contract address'),
  amount: z.string().describe('Amount of tokens to unstake'),
  mnemonic: z.string().describe('Staker wallet mnemonic')
});

export const ClaimStakingRewardsSchema = z.object({
  stakingAddress: z.string().describe('CW20-Staking contract address'),
  mnemonic: z.string().describe('Staker wallet mnemonic')
});

// Merkle Airdrop Schemas
export const DeployMerkleAirdropSchema = z.object({
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

export const ClaimAirdropTokensSchema = z.object({
  airdropAddress: z.string().describe('Merkle Airdrop contract address'),
  amount: z.string().describe('Amount to claim'),
  proof: z.array(z.string()).describe('Merkle proof for the claim'),
  mnemonic: z.string().describe('Claimer wallet mnemonic')
});

export const QueryAirdropSchema = z.object({
  airdropAddress: z.string().describe('Merkle Airdrop contract address'),
  address: z.string().describe('Address to check claim status for')
});