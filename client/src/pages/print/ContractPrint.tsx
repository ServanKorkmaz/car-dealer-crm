import React from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Contract } from "@shared/schema";
import "../../styles/contract-print.css";

interface ContractWithDetails extends Contract {
  car?: {
    make: string;
    model: string;
    year: number;
    registration: string;
    vin: string;
    mileage: number;
    color: string;
  };
  customer?: {
    name: string;
    email: string;
    phone: string;
    address: string;
    postalCode: string;
    city: string;
    personalId: string;
  };
}

export default function ContractPrint() {
  const params = useParams();
  const contractId = params.id;

  const { data: contract } = useQuery<ContractWithDetails>({
    queryKey: ["/api/contracts", contractId],
    enabled: !!contractId,
  });

  if (!contract) {
    return (
      <html>
        <head>
          <meta charSet="utf-8" />
          <title>Laster kontrakt...</title>
        </head>
        <body>
          <div>Laster kontrakt...</div>
        </body>
      </html>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('nb-NO');
  };

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Kjøpekontrakt - {contract.contractNumber}</title>
        <link rel="stylesheet" href="/src/styles/contract-print.css" />
      </head>
      <body>
        <main className="contract">
          <h1>KJØPEKONTRAKT – BRUKTBIL</h1>
          
          <section className="section">
            <h2>1. PARTER</h2>
            <div className="parties-grid">
              <div className="party-column">
                <h3>SELGER</h3>
                <div className="box">
                  <p><strong>ForhandlerPRO AS</strong></p>
                  <p>Organisasjonsnr: 999 888 777</p>
                  <p>Adresse: Testveien 123</p>
                  <p>Postnr/Sted: 0123 Oslo</p>
                  <p>Telefon: +47 12 34 56 78</p>
                  <p>E-post: post@forhandlerpro.no</p>
                </div>
              </div>
              <div className="party-column">
                <h3>KJØPER</h3>
                <div className="box">
                  <p><strong>{contract.customer?.name || 'Navn ikke oppgitt'}</strong></p>
                  <p>Fødselsnr: {contract.customer?.personalId || 'Ikke oppgitt'}</p>
                  <p>Adresse: {contract.customer?.address || 'Ikke oppgitt'}</p>
                  <p>Postnr/Sted: {contract.customer?.postalCode} {contract.customer?.city}</p>
                  <p>Telefon: {contract.customer?.phone || 'Ikke oppgitt'}</p>
                  <p>E-post: {contract.customer?.email || 'Ikke oppgitt'}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <h2>2. KJØRETØY</h2>
            <table className="price-table">
              <tr>
                <td><strong>Merke og modell:</strong></td>
                <td>{contract.car?.make} {contract.car?.model}</td>
              </tr>
              <tr>
                <td><strong>Årsmodell:</strong></td>
                <td>{contract.car?.year}</td>
              </tr>
              <tr>
                <td><strong>Registreringsnummer:</strong></td>
                <td>{contract.car?.registration}</td>
              </tr>
              <tr>
                <td><strong>Chassis-/VIN-nummer:</strong></td>
                <td>{contract.car?.vin}</td>
              </tr>
              <tr>
                <td><strong>Kilometerstand:</strong></td>
                <td>{contract.car?.mileage ? contract.car.mileage.toLocaleString('nb-NO') : 'Ikke oppgitt'} km</td>
              </tr>
              <tr>
                <td><strong>Farge:</strong></td>
                <td>{contract.car?.color}</td>
              </tr>
            </table>
          </section>

          <section className="section">
            <h2>3. PRIS OG BETALINGSBETINGELSER</h2>
            <table className="price-table">
              <tr>
                <td>Salgspris (inkl. mva):</td>
                <td>{formatCurrency(Number(contract.salePrice))}</td>
              </tr>
              <tr className="total-row">
                <td><strong>Totalpris:</strong></td>
                <td><strong>{formatCurrency(Number(contract.salePrice))}</strong></td>
              </tr>
            </table>
            
            <div className="box">
              <p><strong>Salgs- og leveringsdato:</strong> {formatDate(new Date(contract.saleDate).toISOString())}</p>
              <p><strong>Betalingsmåte:</strong> Bankoverføring</p>
            </div>
          </section>

          <section className="section">
            <h2>4. VILKÅR OG BETINGELSER</h2>
            <ol className="terms-list">
              <li>Kjøpet er bindende når kontrakten er signert av begge parter og kjøpesummen er betalt.</li>
              <li>Kjøretøyet selges i den stand det befinner seg i på leveringsdagen, med de feil og mangler som måtte forefinnes.</li>
              <li>Selger garanterer at kjøretøyet er fritt for panterettigheter og andre heftelser på leveringstidspunktet.</li>
              <li>Kjøper har ansvar for omregistrering av kjøretøyet innen 7 dager etter levering.</li>
              <li>Ved forsinket betaling påløper det forsinkelsesrenter i henhold til forsinkelsesrenteloven.</li>
              <li>Tvister løses etter norsk rett, med Oslo tingrett som verneting.</li>
            </ol>
          </section>

          {contract.notes && (
            <section className="section">
              <h2>5. MERKNADER</h2>
              <div className="box">
                <p>{contract.notes}</p>
              </div>
            </section>
          )}

          <section className="signature-section">
            <h2>SIGNATURER</h2>
            <p>Underskrift bekrefter at partene er enige om vilkårene i denne kontrakten.</p>
            
            <div className="signature-grid">
              <div className="signature-column">
                <div className="signature-line">
                  Selger<br />
                  ForhandlerPRO AS<br />
                  Dato: {formatDate(new Date(contract.saleDate).toISOString())}
                </div>
              </div>
              <div className="signature-column">
                <div className="signature-line">
                  Kjøper<br />
                  {contract.customer?.name}<br />
                  Dato: ____________________
                </div>
              </div>
            </div>
          </section>

          <footer style={{ marginTop: "10mm", textAlign: "center", fontSize: "10px", color: "#666" }}>
            <p>Kontraktnummer: {contract.contractNumber} | Generert: {new Date().toLocaleDateString('nb-NO')}</p>
          </footer>
        </main>
      </body>
    </html>
  );
}