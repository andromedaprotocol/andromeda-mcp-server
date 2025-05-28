# Andromeda MCP Server v1.2.0 - New Features

## ADODB (ADO Database) Tools

The Andromeda MCP Server now includes tools for interacting with the ADO Database (ADODB), which stores all available ADO types and their code IDs.

### New ADODB Tools:

1. **query_adodb**
   - Query available ADO types from the ADODB
   - Supports pagination for large result sets
   - Example: `query_adodb({ adoType: "cw20", startAfter: null })`

2. **get_ado_code_id**
   - Get the code ID for a specific ADO type and version
   - Returns the latest version if no version is specified
   - Example: `get_ado_code_id({ adoType: "cw20", version: "2.0.1" })`

3. **list_ado_versions**
   - List all available versions of a specific ADO type
   - Example: `list_ado_versions({ adoType: "cw721" })`

## GraphQL Integration Tools

The server now supports GraphQL queries against the Andromeda indexer for advanced data querying and event monitoring.

### New GraphQL Tools:

1. **graphql_query**
   - Execute any GraphQL query against the Andromeda indexer
   - Supports variables for parameterized queries
   - Example:
   ```javascript
   graphql_query({
     query: `
       query GetChainConfigs {
         chainConfigs {
           allConfigs {
             chainId
             name
             kernelAddress
           }
         }
       }
     `,
     variables: {}
   })
   ```

2. **subscribe_ado_events**
   - Query recent events for a specific ADO contract
   - Currently returns the last 50 events (WebSocket subscriptions coming soon)
   - Example: `subscribe_ado_events({ contractAddress: "andr1..." })`

## Technical Details

### Configuration
- GraphQL Endpoint: `https://api.andromedaprotocol.io/graphql/testnet`
- Kernel Address (galileo-4): `andr14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9shptkql`

### ADODB Interaction
The ADODB tools work by:
1. First querying the kernel contract to get the ADODB address
2. Then querying the ADODB contract directly with the appropriate query message

### GraphQL Schema
The GraphQL integration supports the full Andromeda GraphQL schema, including:
- Chain configurations
- ADO deployments
- Transaction history
- Event logs
- Cross-chain data

## Usage Examples

### Finding Available ADO Types
```javascript
const adoTypes = await query_adodb({});
console.log("Available ADO types:", adoTypes);
```

### Getting Code ID for Deployment
```javascript
const cw20Info = await get_ado_code_id({ adoType: "cw20" });
console.log("CW20 code ID:", cw20Info.code_id);
```

### Monitoring ADO Events
```javascript
const events = await subscribe_ado_events({ 
  contractAddress: "andr1abc..." 
});
console.log("Recent events:", events);
```

### Complex GraphQL Query
```javascript
const result = await graphql_query({
  query: `
    query GetADOsByType($adoType: String!) {
      ados(where: { ado_type: { _eq: $adoType } }) {
        address
        ado_type
        instantiator
        block_height
      }
    }
  `,
  variables: { adoType: "cw20" }
});
```

## Error Handling

All new tools include comprehensive error handling:
- Network errors are caught and returned with descriptive messages
- GraphQL errors are parsed and returned separately from data
- ADODB queries fall back gracefully if kernel queries fail

## Future Enhancements

- WebSocket support for real-time event subscriptions
- Caching for frequently accessed ADODB data
- Batch query support for GraphQL operations
- Integration with Andromeda's IBC functionality
