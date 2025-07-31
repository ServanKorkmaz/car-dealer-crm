# ForhandlerPRO - Dealer Management System

## Overview

ForhandlerPRO is a modern, secure, and scalable Dealer Management System (DMS) designed for small to mid-size car dealerships in Norway. The application provides comprehensive tools for managing car inventory, customer relationships, and sales contracts with a focus on user experience and professional workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

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

## Recent Changes (2025-01-31)

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

1. **Monorepo Structure**: Simplified development and deployment with shared types
2. **Async Storage Pattern**: ESM-compatible dynamic storage provider loading
3. **Flexible Database Support**: Easy switching between Replit and external databases
4. **Session-based Auth**: Simple dev login system for reliable development
5. **Drizzle ORM**: Type-safe database operations with good PostgreSQL support
6. **ShadCN UI**: Professional design system with accessibility built-in
7. **Norwegian Localization**: UI text and formatting tailored for Norwegian market

The system is designed to be modular and extensible, with clear separation of concerns and a foundation ready for additional features like workshop management, parts inventory, and financial reporting.