# ForhandlerPRO Admin Portal

Et separat admin-system for ForhandlerPRO med Supabase-autentisering, organisasjonshåndtering og bruksstatistikk.

## Funksjoner

- 🔐 Supabase-autentisering (email/passord)
- 🏢 Multi-tenant arkitektur med organisasjoner og medlemmer
- 📊 Usage tracking og aggregering
- 👥 Aktive brukere oversikt (siste 15 minutter)
- ⏰ Automatisk daglig aggregering (00:15 Europe/Oslo)
- 🔒 Row Level Security (RLS) på alle tabeller

## Oppsett

### 1. Supabase-oppsett

1. Opprett et nytt Supabase-prosjekt på [supabase.com](https://supabase.com)
2. Gå til SQL Editor og kjør migrasjonen i `supabase/migrations/000_init_core.sql`
3. Kopier prosjekt-URL og API-nøkler fra Settings > API

### 2. Miljøvariabler

Kopier `.env.example` til `.env` og fyll inn verdiene:

```bash
# Fra Supabase Settings > API
VITE_SUPABASE_URL=https://dittprosjekt.supabase.co
VITE_SUPABASE_ANON_KEY=din-anon-key

# Server-side (service role key)
SUPABASE_URL=https://dittprosjekt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=din-service-role-key

PORT=3001  # Bruker port 3001 for å unngå konflikt med ForhandlerPRO
```

### 3. Installasjon og kjøring

```bash
# Fra admin-portal mappen
cd admin-portal

# Installer avhengigheter
npm install

# Bygg og start
npm run build
npm start
```

Systemet kjører nå på http://localhost:3001

## Bruk

1. **Registrering**: Gå til `/login` og opprett en konto
2. **Organisasjon**: Ved første innlogging opprettes automatisk en organisasjon
3. **Dashboard**: Hjemmesiden viser organisasjons-ID og rolle
4. **Admin Usage**: Se aktive brukere siste 15 minutter på `/admin/usage`

## Sikkerhet

- Alle admin-endepunkter krever autentisering
- Kun admin/owner-roller har tilgang til usage-data
- RLS policies beskytter data på database-nivå
- Service role key brukes kun server-side

## API Endepunkter

- `GET /api/health` - Health check (åpen)
- `GET /api/admin/active?orgId=xxx` - Aktive brukere (krever auth + admin)
- `POST /api/admin/aggregateDaily` - Kjør daglig aggregering (krever auth + admin)

## Arkitektur

```
admin-portal/
├── server/           # Express backend
│   ├── index.js      # Server med auth-sjekk
│   └── aggregateDaily.js
├── src/              # React frontend
│   ├── pages/        # Login, Home, UsageAdmin
│   ├── lib/          # Supabase client og tracking
│   └── auth.ts       # Autentisering
└── supabase/         # Database migrations
```

## Utvikling

Systemet er bygget som en statisk React-app servert av Express, med:
- TypeScript for type-sikkerhet
- Tailwind CSS for styling
- Vite for rask utvikling
- Node-cron for scheduled jobs