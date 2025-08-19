# ForhandlerPRO - Dealer Management System

## Overview

ForhandlerPRO is a modern, secure, and scalable Dealer Management System (DMS) designed for small to mid-size car dealerships in Norway. The application provides comprehensive tools for managing car inventory, customer relationships, and sales contracts with a focus on user experience and professional workflows.

## User Preferences

Preferred communication style: Simple, everyday language.
Assistant name: "AI Assistent" (changed from "ForhandlerPRO-assistent")
Assistant mascot: Custom AI Bear figure with brick pattern (replaced MessageCircle icon)

## System Architecture

### Full-Stack Architecture
The application follows a modern full-stack architecture with clear separation between frontend and backend concerns:

- **Frontend**: React-based SPA using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: Flexible PostgreSQL support (Replit built-in or external Supabase)
- **Authentication**: Simple dev login system (bypasses Replit Auth for reliability)
- **UI Framework**: ShadCN UI components with Tailwind CSS styling

### Directory Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express server
├── shared/          # Shared types and schemas
├── migrations/      # Database migrations
└── attached_assets/ # Project documentation
```

## Key Components

### Frontend Architecture
- **React 18** with TypeScript for type safety
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** for server state management and caching
- **React Hook Form** with Zod validation for form handling
- **ShadCN UI** component library built on Radix primitives
- **Tailwind CSS** for styling with dark mode support

### Backend Architecture
- **Express.js** server with TypeScript
- **Drizzle ORM** for database operations with type-safe queries
- **Flexible Database Support**: Replit PostgreSQL (default) or external Supabase
- **Dynamic Storage Provider**: Automatically switches between database providers
- **ESM-Compatible**: Uses async imports for proper module loading
- **Session-based authentication** with simple dev login system
- **Zod schemas** shared between frontend and backend for validation

### Database Design
The database uses PostgreSQL with the following main entities:
- **Users**: Store user profiles and roles (admin/seller)
- **Cars**: Vehicle inventory with pricing, images, and status
- **Customers**: Customer registry with contact information  
- **Contracts**: Sales contracts linking customers and cars
- **Sessions**: Session storage for authentication

### Storage Architecture
- **Dynamic Provider System**: `storagePromise` allows async database switching
- **ESM Compatibility**: Uses dynamic imports for external database providers
- **Automatic Fallback**: Falls back to Replit DB if external provider fails
- **Type Safety**: Consistent IStorage interface across all providers

## Data Flow

### Authentication Flow
1. Development: Simple login system creates test user automatically
2. Session data stored in PostgreSQL sessions table  
3. Protected routes verify authentication status via `/api/auth/user` endpoint
4. Fallback to Replit Auth available for production (currently disabled for reliability)

### CRUD Operations
1. Frontend forms use React Hook Form with Zod validation
2. API requests handled through centralized `apiRequest` utility
3. TanStack Query manages caching and optimistic updates
4. Server validates requests and performs database operations via Drizzle ORM
5. Real-time UI updates through query invalidation

### File Handling
- Car images stored as URL arrays in database
- Future file storage integration planned (likely cloud-based)
- PDF contract generation prepared for implementation

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **wouter**: Lightweight routing
- **express**: Backend server framework

### Development Tools
- **Vite**: Frontend build tool and dev server
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **ESBuild**: Production bundling for server code

### Authentication
- **Replit Auth**: OpenID Connect authentication provider
- **connect-pg-simple**: PostgreSQL session store
- **passport**: Authentication middleware

## Deployment Strategy

### Development Environment
- **Vite dev server** for frontend with HMR
- **tsx** for running TypeScript server in development
- **Database migrations** managed through Drizzle Kit

### Production Build
- Frontend built with Vite to `dist/public`
- Server bundled with ESBuild to `dist/index.js`
- Single deployment artifact with static file serving

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Session management requires `SESSION_SECRET`
- Replit-specific configuration for authentication
- Support for both Replit and external hosting

## Recent Changes (2025-08-19)

### ✅ Natural Language Contract Creation System (COMPLETE)
- **Intelligent Command Parsing**: Parse commands like "Opprett kontrakt på bil PR52981 til Ola Normann, tlf 900 00 000"
- **Flexible Entity Extraction**: Handles multiple Norwegian patterns ("til", "med", "på") with smart boundaries
- **Auto Customer Creation**: Creates new customer if not exists when phone number provided
- **Car Validation**: Validates car exists in database before proceeding
- **Smart Pre-filling**: Contract form automatically filled with customer, car, and sale price
- **Follow-up Questions**: Asks for missing information (e.g., phone number) when needed
- **URL Parameter Handling**: Contracts page detects prefill params and opens form automatically
- **Robust Error Handling**: Clear Norwegian error messages for missing cars or failed operations

### ✅ Enhanced ForhandlerPRO AI Assistant with Answer-First Logic (COMPLETE)
- **Answer-First Intent System**: New logic distinguishes between questions (provide data answers) vs commands (navigate immediately)
- **Confirm Button Navigation**: Non-auto tools display confirm buttons instead of auto-opening pages for better UX
- **Enhanced Database Tools**: Added `countAvailable()` and `mostExpensiveSold()` with proper field mapping
- **Fixed Database Field Mapping**: Updated all assistant tools to use correct schema (`registrationNumber`, `make` vs `brand`, etc.)
- **Smart Context Hints**: Frontend properly sends `activeCompanyId`, `userId`, and `currentRoute` to backend
- **Improved User Experience**: Questions get immediate data answers with optional navigation confirm buttons
- **Production-Ready Integration**: Authentic database queries with multi-tenant scoping and role-based access
- **Norwegian Language Support**: All responses in Norwegian with proper error handling and fallbacks
- **Real-Time Data Access**: Live queries for car inventory, contract status, pricing, and sales analytics

### ✅ Complete Multi-Tenant Row-Level Security Implementation (ACCEPTANCE CRITERIA MET)
- **RLS Policies**: Enabled Row Level Security on all main tables (cars, customers, contracts, activities, user_saved_views, memberships, invites)
- **Company Isolation**: Users can only see data from their company via automatic RLS filtering
- **Database Functions**: Created helper functions (current_user_company_id, current_user_role, has_role) for policy enforcement
- **Field-Level Security**: cars_secure view masks cost_price field for SELGER/VERKSTED roles (shows NULL)
- **Role-Based Delete Restrictions**: Only EIER users can see/use delete buttons on cars, customers, contracts
- **Team Invitation System**: EIER users can invite team members with role assignment via dedicated UI button
- **Storage Layer Updates**: All operations now set user context for RLS and use RLS-enforced queries
- **UI Permission Integration**: Role-based features properly integrated across Cars, Customers, Contracts pages

### ✅ Multi-Tenant Role-Based Access Control Implementation
- **Company Isolation**: Every table now locked to company_id with proper foreign key constraints
- **Role System**: Four user roles implemented (Eier, Selger, Regnskap, Verksted) with granular permissions
- **Field-Level Security**: Sensitive fields like costPrice hidden from non-authorized roles
- **Database Schema**: Added companies, profiles, memberships tables with proper relationships
- **RBAC Service**: Complete role-based access control service with permission checks
- **Data Filtering**: All queries now properly filtered by company membership and role permissions
- **Storage Layer**: Updated storage interface and implementation for multi-tenant operations

### ✅ Smart Rule-Based Activity System
- **Activity Logger**: Real-time event logging for all business operations
- **Alert System**: Intelligent rule-based notifications with priority levels
- **Activities Page**: Professional interface for viewing and managing alerts with filtering
- **Dashboard Integration**: Replaced dummy activity feed with authentic smart alerts
- **Resolution Tracking**: Activities can be marked as resolved with proper state management

## Previous Changes (2025-08-06)

### ✅ Complete Finn.no Import System Overhaul  
- **Advanced Image Extraction**: Multi-strategy approach finds ALL images (up to 40+) from Finn listings
- **UUID-Based Deduplication**: Smart filtering prevents duplicate images using unique identifiers
- **Instant UI Updates**: Direct refetch method ensures imported cars appear immediately
- **Gallery Data Mining**: Extracts images from window.__remixContext for complete photo sets
- **High-Quality Images**: Automatically selects 1600w resolution versions when available
- **Comprehensive Data Merge**: Combines Finn.no data with full SVV registry information

### ✅ Enhanced Sell Car Dialog with Professional UX
- **Modern Modal Interface**: Replaced basic prompt with sophisticated dialog component
- **Real-time Profit Calculation**: Shows live profit/loss calculation based on cost vs sale price
- **Price Context Display**: Shows both original sale price and cost price for reference
- **Input Validation**: Professional form with currency formatting and validation
- **Visual Feedback**: Color-coded profit indicators and loading states
- **Accessibility**: Proper labels, focus management, and keyboard navigation

### ✅ Professional Dashboard with Authentic Data Integration
- **Real Data Analytics**: Dashboard now displays authentic sales data instead of test/dummy data
- **Analytics API Fixed**: Resolved TypeScript errors and field mapping issues in storage.ts
- **Data Source Optimization**: Analytics functions use `saleDate` for historical calculations
- **Authentication Flow**: Fixed dashboard API authentication for proper data retrieval
- **Clean Data Model**: Removed all test data functionality, dashboard shows only real transactions
- **Performance**: Dashboard successfully displays analytics for actual Ford x5 sale (129.000 kr)

## Previous Changes (2025-02-03)

### ✅ Person Number Field Removed
- **Privacy Compliance**: Removed personnummer field from customer database and forms per user request
- **Database Update**: Person number column dropped from customers table
- **Database Switch**: Moved from Supabase to native Replit PostgreSQL for better stability 
- **UI Updates**: Customer forms and contract displays no longer show person number
- **Cleaner Data Model**: Simplified customer schema focusing on essential business information

## Previous Changes (2025-01-31)

### ✅ Supabase Database Migration Complete
- **Successful Migration**: ForhandlerPRO now fully operational with external Supabase database
- **Schema Mapping Fixed**: Resolved snake_case/camelCase conversion between Supabase and application code
- **Complete Data Layer**: All CRUD operations (users, cars, customers, contracts) working with Supabase
- **Authentication Working**: Dev login system successfully creating and retrieving users from Supabase

### ESM-Compatible Database Switching
- **Fixed ESM Module Loading**: Resolved `require is not defined` error with dynamic imports
- **Async Storage Provider**: `createStorage()` now returns Promise<IStorage>
- **Universal Storage Access**: All API endpoints use `await storagePromise` pattern
- **Supabase Integration**: Complete Supabase storage implementation with field mapping

### Database Architecture  
- **Environment-Based Switching**: `DATABASE_PROVIDER=supabase` successfully configured
- **Field Mapping Layer**: Automatic conversion between snake_case (Supabase) and camelCase (app)
- **Type-Safe Interface**: Consistent IStorage interface across all providers
- **Production Ready**: Complete SQL schema with indexes and foreign key constraints

### Key Architectural Decisions

1. **Multi-Tenant Architecture**: Company-isolated data with role-based access control
2. **Four-Role Permission System**: Eier, Selger, Regnskap, Verksted with granular permissions
3. **Field-Level Security**: Sensitive financial data protected by role-based masking
4. **Monorepo Structure**: Simplified development and deployment with shared types
5. **Async Storage Pattern**: ESM-compatible dynamic storage provider loading
6. **Session-based Auth**: Simple dev login system for reliable development
7. **Drizzle ORM**: Type-safe database operations with PostgreSQL support
8. **ShadCN UI**: Professional design system with accessibility built-in
9. **Norwegian Localization**: UI text and formatting tailored for Norwegian market

The system is designed to be modular and extensible, with clear separation of concerns and a foundation ready for additional features like workshop management, parts inventory, and financial reporting.