# Natural Language Contract Creation

## Overview
This feature allows users to create contracts using natural language commands in Norwegian. The system parses the command, extracts customer information and car registration, and pre-fills the contract form.

## Architecture

### 1. Parsing Module (`server/assistantTools.ts`)
**Function:** `parseContractCreationCommand(command, hints)`

Extracts entities from natural language:
- **Customer Name**: Patterns like "til [Name]", "med [Name]"
- **Phone Number**: Supports formats like "900 00 000" or "90000000"
- **Car Registration**: Norwegian format (2 letters + 5 digits)

### 2. Data Operations (`server/storage.ts`)
**Functions:**
- `getCustomers(companyId)`: Fetch existing customers
- `createCustomer(data)`: Create new customer if not exists
- `getCars(companyId)`: Validate car registration

### 3. UI Bridge (`client/src/pages/Contracts.tsx`)
**URL Parameters:**
- `customerId`: Pre-select customer
- `carId`: Pre-select car
- `prefill=true`: Auto-open contract form

### 4. Intent Detection (`server/routes.ts`)
**Pattern:** `/opprett|lag|ny.*kontrakt.*(med|til|på)/i`
**Response Types:**
- Success: Opens pre-filled contract form
- Missing phone: Asks for phone number
- Car not found: Returns error message

## Usage Examples

### Complete Command
```
"Opprett en kontrakt med Servan Korkmaz, med telefonnummer 41383322, på bil PR52981"
→ Creates/finds customer, validates car, opens pre-filled form
```

### Alternative Format
```
"Opprett kontrakt på bil PR52981 til Ola Normann, tlf 900 00 000"
→ Same result with different word order
```

### Missing Phone (Follow-up Required)
```
"Opprett kontrakt på bil PR52981 til Kari Nordmann"
→ Assistant asks: "Hva er telefonnummeret til Kari Nordmann?"
→ After user provides phone, continues with creation
```

### Car Not Found
```
"Opprett kontrakt på bil XX99999 til Test Person, tlf 12345678"
→ Returns: "Bilen med registreringsnummer XX99999 finnes ikke."
```

## Extending the System

### Adding Price Parsing
```javascript
// In parseContractCreationCommand
const priceMatch = command.match(/(?:pris|kr|kroner)[\s:]*(\d+(?:\s+\d+)*)/i);
const salePrice = priceMatch?.[1]?.replace(/\s+/g, '');
```

### Adding Add-ons Support
```javascript
// Parse add-ons like "med vinterdekk og hengerfeste"
const addOnsMatch = command.match(/med\s+(.*?)(?:til|på|$)/i);
const addOns = parseAddOns(addOnsMatch?.[1]);
```

### E-Sign Integration
```javascript
// Add to contract data
contractData.eSignStatus = command.includes('send til signering') ? 'send_now' : 'ikke_sendt';
```

## Testing

Run the test script:
```bash
node test-contract-parsing.js
```

This tests:
- Entity extraction accuracy
- Customer creation/lookup
- Car validation
- Error handling
- Follow-up questions

## Files Modified

- `server/assistantTools.ts`: Added `parseContractCreationCommand()`
- `server/routes.ts`: Added `CREATE_CONTRACT` intent handler
- `client/src/pages/Contracts.tsx`: Added URL parameter handling
- `client/src/components/contracts/EnhancedContractGenerator.tsx`: Added prefill support

## Dependencies

No new dependencies required. Uses existing:
- Drizzle ORM for database operations
- React Hook Form for form pre-filling
- Wouter for routing with query parameters