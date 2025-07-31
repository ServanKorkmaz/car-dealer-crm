# API Setup for Biloppslag

## Statens Vegvesen API-nøkkel

For å aktivere automatisk biloppslag trenger du en API-nøkkel fra Statens Vegvesen.

### Slik får du API-nøkkel:

1. **Gå til Statens Vegvesen API-portal:**
   https://www.vegvesen.no/fag/teknologi/apne-data/slik-far-du-tilgang-til-et-api/

2. **Søk om API-nøkkel for "Tekniske kjøretøyopplysninger enkeltoppslag"**
   - Dette er gratis for privatpersoner og bedrifter
   - Maks 50,000 oppslag per døgn
   - Ingen eierinformasjon, kun tekniske data

3. **Legg inn API-nøkkelen som miljøvariabel i Replit:**
   - Gå til "Secrets" i Replit
   - Legg til ny hemmelighet:
     - Key: `SVV_API_KEY`
     - Value: `din-api-nøkkel-her`

### Testmodus uten API-nøkkel

Hvis du ikke har API-nøkkel ennå, vil systemet vise en melding om at biloppslag ikke er konfigurert.

### Datafelter som hentes automatisk:

- **Grunndata:** Merke, modell, årsmodell
- **Teknisk:** Drivstofftype, girkasse, effekt, CO₂-utslipp
- **Kontroll:** Siste og neste EU-kontroll
- **Annet:** Farge, kilometerstand (hvis tilgjengelig)

Alt legges inn i "Notater"-feltet som strukturert tekst for enkel redigering.

### API-informasjon:

- **Endpoint:** `https://akfell-datautlevering.atlas.vegvesen.no/enkeltoppslag/kjoretoydata`
- **Rate limit:** 50,000 kall per døgn
- **Format:** JSON
- **Dokumentasjon:** https://akfell-datautlevering.atlas.vegvesen.no/swagger-ui/