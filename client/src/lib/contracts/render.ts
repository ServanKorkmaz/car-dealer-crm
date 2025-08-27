import Handlebars from "handlebars";

// Default contract template for Norwegian car dealership
const DEFAULT_CONTRACT_TEMPLATE = `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <title>Kjøpekontrakt</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { 
      color: #2c3e50; 
      border-bottom: 2px solid #3498db; 
      padding-bottom: 10px; 
    }
    h2 { 
      color: #34495e; 
      margin-top: 30px; 
    }
    .header-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .info-item {
      padding: 10px;
      background: #f1f3f4;
      border-radius: 3px;
    }
    .info-label {
      font-weight: bold;
      color: #666;
      font-size: 0.9em;
    }
    .info-value {
      color: #2c3e50;
      margin-top: 5px;
      font-size: 1.1em;
    }
    .price-section {
      background: #e8f4f8;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
      border-left: 4px solid #3498db;
    }
    .total-price {
      font-size: 1.5em;
      font-weight: bold;
      color: #2c3e50;
    }
    .terms-section {
      margin-top: 30px;
      padding: 15px;
      background: #fff9e6;
      border-radius: 5px;
      border: 1px solid #ffd700;
    }
    .signature-section {
      margin-top: 40px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 5px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 40px;
      margin-top: 30px;
    }
    .signature-box {
      text-align: center;
      padding-top: 20px;
    }
    .signature-line {
      border-bottom: 2px solid #333;
      margin: 50px 0 10px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #999;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <h1>KJØPEKONTRAKT - BRUKTBIL</h1>
  
  <div class="header-info">
    <strong>Kontraktnummer:</strong> {{contractNumber}}<br>
    <strong>Dato:</strong> {{saleDate}}
  </div>

  <h2>1. PARTER</h2>
  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">SELGER</div>
      <div class="info-value">
        {{sellerName}}<br>
        Org.nr: {{sellerOrgNumber}}<br>
        {{sellerAddress}}<br>
        Tlf: {{sellerPhone}}<br>
        E-post: {{sellerEmail}}
      </div>
    </div>
    <div class="info-item">
      <div class="info-label">KJØPER</div>
      <div class="info-value">
        {{buyerName}}<br>
        {{#if buyerOrgNumber}}Org.nr: {{buyerOrgNumber}}<br>{{/if}}
        {{buyerAddress}}<br>
        Tlf: {{buyerPhone}}<br>
        E-post: {{buyerEmail}}
      </div>
    </div>
  </div>

  <h2>2. KJØRETØY</h2>
  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Merke/Modell</div>
      <div class="info-value">{{vehicleMake}} {{vehicleModel}}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Årsmodell</div>
      <div class="info-value">{{vehicleYear}}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Registreringsnummer</div>
      <div class="info-value">{{vehicleRegistration}}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Chassis/VIN</div>
      <div class="info-value">{{vehicleVin}}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Kilometerstand</div>
      <div class="info-value">{{vehicleMileage}} km</div>
    </div>
    <div class="info-item">
      <div class="info-label">Leveringsdato</div>
      <div class="info-value">{{deliveryDate}}</div>
    </div>
  </div>

  <h2>3. PRIS OG BETALING</h2>
  <div class="price-section">
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Kjøretøy</div>
        <div class="info-value">kr {{vehiclePrice}}</div>
      </div>
      {{#if accessories}}
      <div class="info-item">
        <div class="info-label">Tilleggsutstyr</div>
        <div class="info-value">kr {{accessories}}</div>
      </div>
      {{/if}}
      {{#if discount}}
      <div class="info-item">
        <div class="info-label">Rabatt</div>
        <div class="info-value">- kr {{discount}}</div>
      </div>
      {{/if}}
      {{#if tradeInValue}}
      <div class="info-item">
        <div class="info-label">Innbytte ({{tradeInRegistration}})</div>
        <div class="info-value">- kr {{tradeInValue}}</div>
      </div>
      {{/if}}
    </div>
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">
    <div class="total-price">
      Totalpris inkl. MVA: kr {{totalPrice}}
    </div>
    {{#if financingType}}
    <div style="margin-top: 15px;">
      <strong>Finansiering:</strong> {{financingType}}<br>
      {{#if downPayment}}<strong>Egenandel:</strong> kr {{downPayment}}<br>{{/if}}
      {{#if monthlyPayment}}<strong>Månedlig:</strong> kr {{monthlyPayment}}<br>{{/if}}
      {{#if loanTerm}}<strong>Lånetid:</strong> {{loanTerm}} måneder<br>{{/if}}
    </div>
    {{/if}}
  </div>

  <h2>4. VILKÅR OG BETINGELSER</h2>
  <div class="terms-section">
    <p><strong>Garanti:</strong> {{#if warranty}}{{warrantyDescription}}{{else}}Iht. forbrukerkjøpsloven{{/if}}</p>
    <p><strong>Leveringssted:</strong> Selgers forretningslokaler</p>
    <p><strong>Eierskap:</strong> Eiendomsretten til kjøretøyet går over til kjøper når full betaling er mottatt</p>
    <p><strong>Risiko:</strong> Risikoen for kjøretøyet går over til kjøper ved levering</p>
    {{#if isDistanceSale}}
    <p><strong>Angrerett:</strong> Som forbruker har du 14 dagers angrerett fra levering iht. angrerettloven</p>
    {{/if}}
    {{#if specialTerms}}
    <p><strong>Spesielle betingelser:</strong><br>{{specialTerms}}</p>
    {{/if}}
  </div>

  <h2>5. BEKREFTELSE</h2>
  <p>
    Begge parter bekrefter med dette at de har lest og forstått alle vilkår i denne kontrakten. 
    Kjøper bekrefter å ha mottatt all nødvendig informasjon om kjøretøyet, inkludert service- og 
    reparasjonshistorikk som selger har kjennskap til.
  </p>

  <div class="signature-section">
    <h3>Signaturer</h3>
    <div class="signature-grid">
      <div class="signature-box">
        <div class="signature-line"></div>
        <strong>Selger</strong><br>
        {{sellerName}}<br>
        Dato: {{signatureDate}}
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <strong>Kjøper</strong><br>
        {{buyerName}}<br>
        Dato: {{signatureDate}}
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Kontrakt generert av ForhandlerPRO DMS - {{generatedDate}}</p>
  </div>
</body>
</html>
`;

export interface ContractData {
  contractNumber: string;
  saleDate: string;
  
  // Seller info
  sellerName: string;
  sellerOrgNumber: string;
  sellerAddress: string;
  sellerPhone: string;
  sellerEmail: string;
  
  // Buyer info
  buyerName: string;
  buyerOrgNumber?: string;
  buyerAddress: string;
  buyerPhone: string;
  buyerEmail: string;
  
  // Vehicle info
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleRegistration: string;
  vehicleVin: string;
  vehicleMileage: string;
  deliveryDate: string;
  
  // Price info
  vehiclePrice: string;
  accessories?: string;
  discount?: string;
  tradeInValue?: string;
  tradeInRegistration?: string;
  totalPrice: string;
  
  // Financing
  financingType?: string;
  downPayment?: string;
  monthlyPayment?: string;
  loanTerm?: string;
  
  // Terms
  warranty?: boolean;
  warrantyDescription?: string;
  isDistanceSale?: boolean;
  specialTerms?: string;
  
  // Meta
  signatureDate: string;
  generatedDate: string;
}

// Register Handlebars helpers
Handlebars.registerHelper('if', function(this: any, conditional: any, options: any) {
  if (conditional) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

export function renderContractTemplate(data: Partial<ContractData>, template?: string): string {
  const templateToUse = template || DEFAULT_CONTRACT_TEMPLATE;
  const compiledTemplate = Handlebars.compile(templateToUse);
  
  // Add default values and formatting
  const formattedData = {
    ...data,
    generatedDate: new Date().toLocaleDateString('no-NO'),
    signatureDate: new Date().toLocaleDateString('no-NO'),
  };
  
  return compiledTemplate(formattedData);
}

export function prepareContractData(contract: any, car: any, customer: any, company: any): ContractData {
  const today = new Date().toLocaleDateString('no-NO');
  
  return {
    contractNumber: contract.contractNumber || `K-${Date.now()}`,
    saleDate: contract.saleDate ? new Date(contract.saleDate).toLocaleDateString('no-NO') : today,
    
    // Seller (company) info  
    sellerName: company?.name || 'ForhandlerPRO AS',
    sellerOrgNumber: company?.orgNumber || '123456789',
    sellerAddress: company?.address || 'Storgata 1, 0000 Oslo',
    sellerPhone: company?.phone || '+47 12345678',
    sellerEmail: company?.email || 'post@forhandler.no',
    
    // Buyer (customer) info
    buyerName: customer?.name || '',
    buyerOrgNumber: customer?.orgNumber,
    buyerAddress: customer?.address || '',
    buyerPhone: customer?.phone || '',
    buyerEmail: customer?.email || '',
    
    // Vehicle info
    vehicleMake: car?.make || '',
    vehicleModel: car?.model || '',
    vehicleYear: car?.year?.toString() || '',
    vehicleRegistration: car?.registrationNumber || '',
    vehicleVin: car?.vin || '',
    vehicleMileage: car?.mileage?.toLocaleString('no-NO') || '',
    deliveryDate: contract.deliveryDate ? 
      new Date(contract.deliveryDate).toLocaleDateString('no-NO') : 
      today,
    
    // Price info
    vehiclePrice: (parseFloat(contract.salePrice || car?.salePrice || '0')).toLocaleString('no-NO'),
    accessories: contract.accessories && parseFloat(contract.accessories) > 0 ? 
      parseFloat(contract.accessories).toLocaleString('no-NO') : undefined,
    discount: contract.discount && parseFloat(contract.discount) > 0 ? 
      parseFloat(contract.discount).toLocaleString('no-NO') : undefined,
    tradeInValue: contract.tradeInValue && parseFloat(contract.tradeInValue) > 0 ? 
      parseFloat(contract.tradeInValue).toLocaleString('no-NO') : undefined,
    tradeInRegistration: contract.tradeInRegistration,
    totalPrice: calculateTotalPrice(contract, car).toLocaleString('no-NO'),
    
    // Financing
    financingType: getFinancingTypeLabel(contract.financingType),
    downPayment: contract.downPayment && parseFloat(contract.downPayment) > 0 ? 
      parseFloat(contract.downPayment).toLocaleString('no-NO') : undefined,
    monthlyPayment: contract.monthlyPayment && parseFloat(contract.monthlyPayment) > 0 ? 
      parseFloat(contract.monthlyPayment).toLocaleString('no-NO') : undefined,
    loanTerm: contract.loanTerm,
    
    // Terms
    warranty: contract.warranty || false,
    warrantyDescription: contract.warrantyDescription || 'Standard forhandlergaranti 3 måneder',
    isDistanceSale: contract.isDistanceSale || false,
    specialTerms: contract.notes,
    
    signatureDate: today,
    generatedDate: today,
  };
}

function calculateTotalPrice(contract: any, car: any): number {
  const basePrice = parseFloat(contract.salePrice || car?.salePrice || '0');
  const accessories = parseFloat(contract.accessories || '0');
  const discount = parseFloat(contract.discount || '0');
  const tradeIn = parseFloat(contract.tradeInValue || '0');
  
  return basePrice + accessories - discount - tradeIn;
}

function getFinancingTypeLabel(type?: string): string | undefined {
  switch(type) {
    case 'loan': return 'Billån';
    case 'lease': return 'Leasing';
    case 'cash': return 'Kontant';
    default: return undefined;
  }
}