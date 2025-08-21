## Overview

ForhandlerPRO is a modern, secure, and scalable Dealer Management System (DMS) designed for small to mid-size car dealerships in Norway. It provides comprehensive tools for managing car inventory, customer relationships, and sales contracts, focusing on user experience and professional workflows. The project aims to streamline dealership operations, enhance customer management, and provide robust sales contract capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.
Assistant name: "AI Assistent"
Assistant mascot: Custom full-body AI Bear figure with brick pattern

## System Architecture

### Full-Stack Architecture
The application employs a modern full-stack architecture with clear separation of concerns:
- **Frontend**: React-based SPA using Vite.
- **Backend**: Express.js server with TypeScript.
- **Database**: PostgreSQL support (Replit built-in or external Supabase).
- **Authentication**: Supabase Auth integrated for production-ready authentication, supporting email/password and Google OAuth, with a simple dev login system for development.
- **UI Framework**: ShadCN UI components with Tailwind CSS for styling.

### Key Architectural Decisions
- **Multi-Tenant Architecture**: Organization-isolated data with Row Level Security (RLS) enforcement on all main tables to ensure users only see data from their company.
- **Role-Based Access Control (RBAC)**: A six-role system (Owner, Admin, Sales, Workshop, Accountant, Viewer) with granular permissions and field-level security to protect sensitive data like `costPrice`.
- **Monorepo Structure**: Simplifies development with shared types across frontend and backend.
- **Asynchronous Storage Pattern**: Enables ESM-compatible dynamic storage provider loading.
- **Plan-Based Feature System**: Supports tiered access control (Basic, Pro, Enterprise) with feature gating.
- **Drizzle ORM**: For type-safe database operations.
- **ShadCN UI**: Provides a professional, accessible design system with dark mode support.
- **Norwegian Localization**: UI text and formatting are tailored for the Norwegian market.
- **Smart Rule-Based Activity System**: For real-time event logging and intelligent notifications.
- **Natural Language Contract Creation System**: Parses commands to pre-fill contract forms and automatically creates new customers if needed.
- **Enhanced AI Assistant (Chatbot Only)**: Features an "Answer-First" intent system for distinguishing between questions and commands, providing immediate data answers for questions and requiring confirmation for navigation from commands. AI Price Assistant functionality has been completely removed per user request.

### Database Design
The PostgreSQL database includes:
- **Users**: User profiles and roles.
- **Cars**: Vehicle inventory with pricing, images, and status.
- **Customers**: Customer registry with contact information.
- **Contracts**: Sales contracts linking customers and cars.
- **Sessions**: Session storage for authentication.
- **Companies**: For multi-tenant isolation.
- **Memberships**: Linking users to companies and roles.
- **Activities**: For logging business operations and alerts.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connection.
- **drizzle-orm**: Type-safe database ORM.
- **@tanstack/react-query**: Server state management and caching.
- **@radix-ui/***: Accessible UI primitives for ShadCN UI.
- **wouter**: Lightweight client-side routing.
- **express**: Backend server framework.
- **Vite**: Frontend build tool and dev server.
- **TypeScript**: For type safety across the stack.
- **Tailwind CSS**: Utility-first styling.
- **ESBuild**: Production bundling for server code.
- **Replit Auth**: OpenID Connect authentication provider (used for dev login).
- **connect-pg-simple**: PostgreSQL session store.
- **passport**: Authentication middleware.
- **Supabase**: External database and authentication provider (used for production environments).