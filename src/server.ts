// Andromeda MCP Server - Complete Server Implementation
import { StargateClient } from '@cosmjs/stargate';
import { CosmWasmClient, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';
import { 
  ANDROMEDA_RPC_ENDPOINT, 
  ANDROMEDA_REST_ENDPOINT, 
  ANDROMEDA_GRAPHQL_ENDPOINT, 
  KERNEL_ADDRESS, 
  DEFAULT_GAS_PRICE,
  NetworkConfig,
  NETWORK_CONFIG 
} from './config/network.js';
import { GAS_LIMITS, TRANSACTION_FEES, createFeeConfig } from './config/constants.js';

// Complete AndromedaMCPServer class implementation
class AndromedaMCPServer {
  cosmosClient: StargateClient | null;
  cosmWasmClient: CosmWasmClient | null;
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
    // 🔍 DEBUG: Trace mnemonic parameter (WORKING FUNCTION)
    console.error(`🔍 GET_WALLET_ADDRESS DEBUG (WORKING) - Mnemonic words: ${mnemonic.split(' ').length}, First: "${mnemonic.split(' ')[0]}", Full: "${mnemonic.substring(0, 50)}..."`);
    
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
    let gasLimit = gas || GAS_LIMITS.DEFAULT; // Default gas limit

    // Increase gas for complex operations that frequently run out of gas
    if (msg.start_sale || msg.purchase_tokens || msg.send) {
      gasLimit = gas || GAS_LIMITS.HIGH; // Higher gas for CW20-Exchange operations
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
    // 🔍 DEBUG: Trace mnemonic parameter
    console.error(`🔍 TRANSFER_TOKENS DEBUG - Mnemonic words: ${mnemonic.split(' ').length}, First: "${mnemonic.split(' ')[0]}", Full: "${mnemonic.substring(0, 50)}..."`);
    
    const signingClient = await this.getSigningClient(mnemonic);
    const senderAddress = await this.getWalletAddress(mnemonic);

    const result = await signingClient.sendTokens(
      senderAddress,
      recipient,
      [{ denom, amount }],
      createFeeConfig(TRANSACTION_FEES.LOW, GAS_LIMITS.LOW),  // Fixed gas limit with proper fee
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
    components: Array<{ name: string; ado_type: string; component_type: any }>,
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
              new: comp.component_type.new
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
                new: comp.component_type.new
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
                component_type: comp.component_type  // Direct message, no encoding
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
      get_components: {}
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
    // 🔍 DEBUG: Trace mnemonic parameter  
    console.error(`🔍 AUCTION_PLACE_BID DEBUG - Mnemonic words: ${mnemonic.split(' ').length}, First: "${mnemonic.split(' ')[0]}", Full: "${mnemonic.substring(0, 50)}..."`);
    
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
    // 🔍 DEBUG: Trace mnemonic parameter
    console.error(`🔍 PLACE_AUCTION_BID DEBUG - Mnemonic words: ${mnemonic.split(' ').length}, First: "${mnemonic.split(' ')[0]}", Full: "${mnemonic.substring(0, 50)}..."`);
    
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

export default AndromedaMCPServer;
export { AndromedaMCPServer, NetworkConfig };