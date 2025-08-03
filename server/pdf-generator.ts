import puppeteer from 'puppeteer';
import type { Contract, Car, Customer } from '@shared/schema';

export function generateContractHTML(contract: Contract, car: Car, customer: Customer): string {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string | null): string => {
    if (!date) return 'Ikke oppgitt';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('nb-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="nb">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kjøpekontrakt - ${contract.contractNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
          padding: 40px;
          font-size: 12px;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
        }

        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 8px;
        }

        .subtitle {
          font-size: 16px;
          color: #64748b;
          font-weight: 500;
        }

        .contract-title {
          font-size: 20px;
          font-weight: bold;
          color: #1e293b;
          margin: 30px 0 20px 0;
          text-align: center;
        }

        .section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }

        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 15px;
          padding-bottom: 5px;
          border-bottom: 1px solid #e2e8f0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }

        .info-box {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 4px 0;
        }

        .info-label {
          font-weight: 600;
          color: #475569;
          min-width: 120px;
        }

        .info-value {
          color: #1e293b;
          font-weight: 500;
        }

        .car-details {
          background: #fef3c7;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
          margin-bottom: 20px;
        }

        .price-box {
          background: #dcfce7;
          padding: 25px;
          border-radius: 8px;
          border-left: 4px solid #22c55e;
          text-align: center;
          margin: 30px 0;
        }

        .price-amount {
          font-size: 32px;
          font-weight: bold;
          color: #15803d;
          margin-bottom: 5px;
        }

        .price-label {
          font-size: 14px;
          color: #166534;
          font-weight: 500;
        }

        .terms {
          background: #f1f5f9;
          padding: 25px;
          border-radius: 8px;
          margin: 30px 0;
          border: 1px solid #e2e8f0;
        }

        .terms-title {
          font-size: 14px;
          font-weight: bold;
          color: #1e293b;
          margin-bottom: 15px;
        }

        .terms-list {
          list-style: none;
          counter-reset: term-counter;
        }

        .terms-list li {
          counter-increment: term-counter;
          margin-bottom: 10px;
          padding-left: 25px;
          position: relative;
        }

        .terms-list li::before {
          content: counter(term-counter) ".";
          position: absolute;
          left: 0;
          font-weight: bold;
          color: #2563eb;
        }

        .signatures {
          margin-top: 50px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
        }

        .signature-box {
          text-align: center;
          padding-top: 60px;
          border-top: 2px solid #1e293b;
        }

        .signature-title {
          font-weight: bold;
          color: #1e293b;
          margin-bottom: 5px;
        }

        .signature-info {
          color: #64748b;
          font-size: 11px;
        }

        .footer {
          margin-top: 60px;
          text-align: center;
          color: #64748b;
          font-size: 10px;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }

        .contract-number {
          background: #eff6ff;
          color: #2563eb;
          padding: 5px 15px;
          border-radius: 20px;
          font-weight: bold;
          display: inline-block;
          margin-bottom: 10px;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 15px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-signed {
          background: #dcfce7;
          color: #166534;
        }

        .notes-section {
          background: #fefce8;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #eab308;
          margin: 20px 0;
        }

        @media print {
          body {
            padding: 20px;
          }
          .page-break {
            page-break-before: always;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">ForhandlerPRO</div>
        <div class="subtitle">Profesjonelt bilsalg</div>
      </div>

      <div class="contract-title">
        <div class="contract-number">Kontrakt ${contract.contractNumber}</div>
        <span class="status-badge status-${contract.status}">
          ${contract.status === 'pending' ? 'Venter signering' : 'Signert'}
        </span>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <div class="section-title">Kjøper</div>
          <div class="info-row">
            <span class="info-label">Navn:</span>
            <span class="info-value">${customer.name}</span>
          </div>
          ${customer.email ? `
          <div class="info-row">
            <span class="info-label">E-post:</span>
            <span class="info-value">${customer.email}</span>
          </div>
          ` : ''}
          ${customer.phone ? `
          <div class="info-row">
            <span class="info-label">Telefon:</span>
            <span class="info-value">${customer.phone}</span>
          </div>
          ` : ''}
          ${customer.address ? `
          <div class="info-row">
            <span class="info-label">Adresse:</span>
            <span class="info-value">${customer.address}</span>
          </div>
          ` : ''}
          ${customer.organizationNumber ? `
          <div class="info-row">
            <span class="info-label">Org.nr:</span>
            <span class="info-value">${customer.organizationNumber}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Type:</span>
            <span class="info-value">${customer.type === 'individual' ? 'Privat' : 'Bedrift'}</span>
          </div>
        </div>

        <div class="info-box">
          <div class="section-title">Kontraktdetaljer</div>
          <div class="info-row">
            <span class="info-label">Dato:</span>
            <span class="info-value">${formatDate(contract.saleDate)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value">${contract.status === 'pending' ? 'Venter signering' : 'Signert og gyldig'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Opprettet:</span>
            <span class="info-value">${formatDate(contract.createdAt)}</span>
          </div>
        </div>
      </div>

      <div class="car-details">
        <div class="section-title">Kjøretøyinformasjon</div>
        <div class="info-grid">
          <div>
            <div class="info-row">
              <span class="info-label">Registrering:</span>
              <span class="info-value">${car.registrationNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Merke:</span>
              <span class="info-value">${car.make}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Modell:</span>
              <span class="info-value">${car.model}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Årsmodell:</span>
              <span class="info-value">${car.year}</span>
            </div>
          </div>
          <div>
            <div class="info-row">
              <span class="info-label">Kilometerstand:</span>
              <span class="info-value">${car.mileage ? car.mileage.toLocaleString('nb-NO') + ' km' : 'Ikke oppgitt'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Drivstoff:</span>
              <span class="info-value">${car.fuelType || 'Ikke oppgitt'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Effekt:</span>
              <span class="info-value">${car.power ? car.power + ' hk' : 'Ikke oppgitt'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Chassisnummer:</span>
              <span class="info-value">${car.chassisNumber || 'Ikke oppgitt'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="price-box">
        <div class="price-amount">${formatCurrency(contract.salePrice)}</div>
        <div class="price-label">Salgspris inkl. mva</div>
      </div>

      ${contract.notes ? `
      <div class="notes-section">
        <div class="section-title">Merknad</div>
        <p>${contract.notes}</p>
      </div>
      ` : ''}

      <div class="terms">
        <div class="terms-title">Avtalevilkår</div>
        <ul class="terms-list">
          <li>Kjøpet gjennomføres på "som den er" basis med mindre annet er skriftlig avtalt.</li>
          <li>Kjøper har rett til å undersøke kjøretøyet før overtakelse.</li>
          <li>Selger garanterer at kjøretøyet er fritt for heftelser og pantelån ved levering.</li>
          <li>Eierskifte skal gjennomføres umiddelbart ved overtakelse av kjøretøy.</li>
          <li>Kjøper overtar alle kostnader knyttet til kjøretøyet fra overtakelsesdato.</li>
          <li>Eventuelle reklamasjoner må fremmes skriftlig innen 14 dager etter overtakelse.</li>
          <li>Denne avtalen er bindende for begge parter ved underskrift.</li>
        </ul>
      </div>

      <div class="signatures">
        <div class="signature-box">
          <div class="signature-title">Selger</div>
          <div class="signature-info">ForhandlerPRO<br>Signatur og dato</div>
        </div>
        <div class="signature-box">
          <div class="signature-title">Kjøper</div>
          <div class="signature-info">${customer.name}<br>Signatur og dato</div>
        </div>
      </div>

      <div class="footer">
        <p>Dette dokumentet er generert elektronisk av ForhandlerPRO systemet den ${formatDate(new Date())}</p>
        <p>Kontrakt-ID: ${contract.id} | Kjøretøy-ID: ${car.id}</p>
      </div>
    </body>
    </html>
  `;
}

export async function generatePDF(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: true,
      preferCSSPageSize: true
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}