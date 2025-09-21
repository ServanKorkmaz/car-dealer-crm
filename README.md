This is v1.0.0

**ForhandlerPRO** is a modern Dealer Management System (DMS) built for car dealers.  
It brings together inventory, customer management, contracts, and integrations — all in one platform.

---

## Features
- **Inventory Management** – Register, track, and manage cars with details and photos  
- **CRM** – Store customer data, leads, and follow-ups  
- **Contracts** – Generate and export professional contracts (PDF & e-sign)  
- **Finance & Integrations**  
  - Faktura & regnskap (Tripletex, PowerOffice Go)  
  - SVV API for car data & verification  
  - FINN.no import/export of ads  
- **Admin Dashboard** – User roles, permissions, and activity logs  
- **Notifications** – Email & SMS integration for customer communication  

---

## Tech Stack
- **Frontend**: React (TypeScript), Tailwind CSS  
- **Backend**: Node.js (TypeScript), Supabase (Postgres + RLS), Edge Functions  
- **Auth**: Supabase Auth with Row Level Security (RLS)  
- **Other**: REST APIs, FINN/SVV/Tripletex integrations  

---

## Getting Started

### Prerequisites
- Node.js 18+  
- Supabase project with database & API keys  
- FINN, SVV, and Tripletex API credentials (optional)  

### Installation
```
# Clone repository
git clone https://github.com/username/forhandlerpro.git

# Navigate to project
cd forhandlerpro

# Install dependencies
npm install

# Start development server
npm run dev
Environment Variables
Create a .env file in the root directory:

env
Copy code
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
FINN_API_KEY=your_finn_api_key
SVV_API_KEY=your_svv_api_key
TRIPLETEX_API_KEY=your_tripletex_api_key
- Roadmap
 AI-powered price suggestions

 Workshop & parts module

 Multi-language support (NO/EN)

 Mobile app version
