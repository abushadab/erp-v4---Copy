# ERP System - Comprehensive Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Current Implementation Status](#current-implementation-status)
5. [Database Schema](#database-schema)
6. [Development Guidelines](#development-guidelines)
7. [Deployment & Environment](#deployment--environment)
8. [Feature Roadmap](#feature-roadmap)
9. [Development Coordination](#development-coordination)

---

## Project Overview

A modern, full-featured **Enterprise Resource Planning (ERP) system** designed for comprehensive business management. The system handles inventory, purchases, sales, warehousing, and supplier management with a focus on multi-warehouse operations.

### Key Business Features
- **Multi-Warehouse Inventory Management**
- **Product Management** (Simple & Variation Products)
- **Supplier & Purchase Management**
- **Sales & Returns Processing**
- **Real-time Stock Tracking**
- **User Authentication & Authorization**

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI + Radix UI primitives
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Fonts**: Inter

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with SSR
- **Real-time**: Supabase Realtime subscriptions
- **Security**: Row Level Security (RLS)

### Development Tools
- **Component Development**: Storybook 8.6
- **Testing**: Vitest
- **Linting**: ESLint
- **Package Manager**: npm

---

## Architecture

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Main dashboard
│   ├── products/          # Product management
│   │   ├── categories/    # Category CRUD
│   │   ├── attributes/    # Attribute management
│   │   └── add/          # Product creation
│   ├── purchases/         # Purchase management
│   │   └── suppliers/    # Supplier management
│   ├── warehouses/        # Warehouse management
│   ├── sales/            # Sales management
│   ├── returns/          # Return processing
│   └── login/            # Authentication
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── layout/           # Layout components
│   ├── products/         # Product-specific components
│   ├── sales/            # Sales components
│   └── packaging/        # Packaging components
├── lib/                   # Utility functions
│   ├── supabase/         # Database operations
│   │   ├── client.ts     # Browser client
│   │   ├── server.ts     # Server client
│   │   ├── mutations.ts  # CRUD operations
│   │   ├── queries.ts    # Data fetching
│   │   └── transforms.ts # Data transformations
│   ├── hooks/            # Custom React hooks
│   └── utils/            # General utilities
└── stories/               # Storybook stories
```

### Authentication Flow
1. **Middleware** (`src/middleware.ts`) - Session refresh and redirects
2. **Server Client** - Server-side operations
3. **Browser Client** - Client-side operations
4. **Conditional Layout** - Auth-aware layout rendering

---

## Current Implementation Status

### ✅ **Fully Implemented & Production Ready**

#### 1. Authentication System
- Supabase Auth with SSR support
- Middleware-based session management
- Automatic redirects for unauthenticated users
- Secure cookie handling

#### 2. Product Categories Management
- **File**: `src/app/products/categories/page.tsx`
- Full CRUD operations with Supabase integration
- Parent-child category relationships
- Delete validation (prevents deletion with subcategories)
- Real-time UI updates with toast notifications
- **Database Status**: 7 categories currently stored

#### 3. Product Attributes Management
- **File**: `src/app/products/attributes/page.tsx`
- Attribute creation with multiple values
- Attribute-value relationship management
- Delete protection with value count display
- **Database Status**: 1 attribute (Size) with 4 values

#### 4. Multi-Warehouse Stock System
- **Core Table**: `product_warehouse_stock`
- Per-warehouse inventory tracking
- Stock reservations and movements
- Warehouse-specific buying prices
- Real-time stock calculations
- **Database Status**: 3 warehouses configured

#### 5. Supplier Management
- **File**: `src/app/purchases/suppliers/page.tsx`
- Complete supplier CRUD operations
- Status management (Active/Inactive)
- Contact information management
- Integration ready for purchase tracking

#### 6. Product Management
- **Files**: `src/app/products/add/page.tsx`, `src/app/products/page.tsx`
- Support for simple and variation products
- SKU validation with database checks
- Category and attribute assignment
- **Database Status**: 16 products (12 simple + 4 variation)

### 🔄 **Partially Implemented**

#### 1. Purchase System Integration
- **Priority**: High
- **Issue**: Supplier totals (`total_purchases`, `total_spent`) not connected to actual purchases
- **Solution Required**: Database triggers + backend integration
- **Files Affected**: `src/lib/supabase/mutations.ts`, `src/app/purchases/suppliers/page.tsx`

#### 2. Legacy Column Migration
- **Status**: In progress
- **Issue**: Removing single-warehouse columns from products table
- **Affected Columns**: `warehouse_id`, `buying_price`, `stock`, `bought_quantity`
- **Files to Update**: Listed in `UPDATE_CODE_FOR_LEGACY_REMOVAL.md`

### 📋 **Planned Features**
- Sales management enhancement
- Return processing system
- Advanced reporting and analytics
- Packaging management
- Accounting integration

---

## Database Schema

### Core Tables

#### Products & Inventory
```sql
-- Main products table
products (
  id, name, sku, description, category_id, 
  product_type, status, created_at, updated_at
)

-- Multi-warehouse stock tracking
product_warehouse_stock (
  id, product_id, warehouse_id, variation_id,
  current_stock, reserved_stock, available_stock,
  buying_price, bought_quantity, last_movement_at
)

-- Product variations
product_variations (
  id, product_id, sku, name, status
)

-- Stock movements tracking
stock_movements (
  id, product_id, variation_id, warehouse_id,
  movement_type, quantity, reference_type, reference_id
)
```

#### Categories & Attributes
```sql
-- Hierarchical categories
categories (
  id, name, description, parent_id, status
)

-- Product attributes (Size, Color, etc.)
attributes (
  id, name, description, status
)

-- Attribute values
attribute_values (
  id, attribute_id, value, status
)
```

#### Suppliers & Purchases
```sql
-- Supplier management
suppliers (
  id, name, contact_person, email, phone,
  address, status, total_purchases, total_spent
)

-- Purchase orders
purchases (
  id, supplier_id, purchase_number, status,
  total_amount, notes, created_at
)
```

#### Warehouses
```sql
-- Warehouse locations
warehouses (
  id, name, location, description, status
)
```

---

## Development Guidelines

### Code Standards
1. **TypeScript**: Strict mode enabled, full type safety required
2. **Components**: Functional components with hooks
3. **Styling**: Tailwind CSS classes, no custom CSS
4. **Forms**: React Hook Form + Zod validation
5. **Database**: Supabase client patterns (server/browser)

### File Naming Conventions
- **Pages**: `page.tsx` (App Router)
- **Components**: PascalCase (e.g., `ProductModal.tsx`)
- **Utilities**: camelCase (e.g., `formatCurrency.ts`)
- **Types**: `types.ts` or inline interfaces

### Database Operations
- **Queries**: Use `src/lib/supabase/queries.ts`
- **Mutations**: Use `src/lib/supabase/mutations.ts`
- **Transforms**: Use `src/lib/supabase/transforms.ts`
- **Error Handling**: Always include try-catch blocks
- **Loading States**: Implement for all async operations

### UI/UX Standards
- **Toast Notifications**: Use Sonner for user feedback
- **Loading States**: Skeleton components or spinners
- **Error States**: Clear error messages with retry options
- **Responsive Design**: Mobile-first approach
- **Accessibility**: ARIA labels and keyboard navigation

---

## Deployment & Environment

### Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development Commands
```bash
# Development server
npm run dev

# Production build
npm run build
npm run start

# Component development
npm run storybook

# Linting
npm run lint
```

### Database Setup
1. Create Supabase project
2. Run SQL migrations from root directory
3. Configure Row Level Security (RLS)
4. Set up authentication providers

---

## Feature Roadmap

### Immediate Priorities (Next 1-2 weeks)
1. **Supplier Purchase Integration** (High Priority)
   - Connect supplier totals to purchase system
   - Implement database triggers
   - Update frontend calculations

2. **Legacy Column Cleanup**
   - Complete migration to multi-warehouse system
   - Update TypeScript types
   - Remove deprecated code

### Medium Term (1-2 months)
1. **Enhanced Sales Management**
2. **Advanced Reporting Dashboard**
3. **Return Processing System**
4. **Packaging Management**

### Long Term (3+ months)
1. **Accounting Integration**
2. **Advanced Analytics**
3. **Mobile App Development**
4. **API Development for Third-party Integration**

---

## Development Coordination

### Multi-Environment Development Strategy

Since you're working across **Cursor AI** and **Trae AI** environments:

#### Recommended Workflow
1. **Feature Planning**: Use this documentation to coordinate features
2. **Branch Strategy**: 
   - `main` - Production ready code
   - `feature/[feature-name]` - Individual features
   - `hotfix/[issue]` - Critical fixes

3. **Communication Protocol**:
   - Update `TODO.md` for task status
   - Document changes in relevant `.md` files
   - Use commit messages with clear feature descriptions

#### Environment-Specific Guidelines

**Cursor AI Environment**:
- Focus on careful editing of existing features
- Ideal for: Bug fixes, UI improvements, code refactoring
- Recommended files: Component files, styling updates

**Trae AI Environment** (Current):
- Focus on new feature development
- Ideal for: New pages, database operations, architecture changes
- Recommended files: New components, database migrations, API endpoints

#### Conflict Prevention
1. **File-Level Coordination**: Avoid editing the same files simultaneously
2. **Feature Isolation**: Work on different modules/features
3. **Regular Syncing**: Frequent commits and pulls
4. **Documentation Updates**: Always update relevant `.md` files

#### Recommended Division

**Cursor AI Focus Areas**:
- UI/UX improvements on existing pages
- Component styling and animations
- Form validation enhancements
- Bug fixes in existing functionality

**Trae AI Focus Areas**:
- New feature development
- Database schema changes
- New API endpoints
- Architecture improvements

---

## Quick Reference

### Key Files to Monitor
- `TODO.md` - Current task status
- `SUPABASE_INTEGRATION_SUMMARY.md` - Database integration status
- `MULTI_WAREHOUSE_IMPLEMENTATION.md` - Warehouse system details
- `UPDATE_CODE_FOR_LEGACY_REMOVAL.md` - Migration tasks

### Important Directories
- `src/app/` - All application pages
- `src/components/` - Reusable components
- `src/lib/supabase/` - Database operations
- `*.sql` files - Database migrations

### Development URLs
- Development: `http://localhost:3000`
- Storybook: `http://localhost:6006`
- Supabase Dashboard: Your project URL

---

*Last Updated: [Current Date]*
*Version: 1.0*
*Maintainer: Development Team*