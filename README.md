# ERP System

A modern, full-featured Enterprise Resource Planning (ERP) system built with Next.js 15, TypeScript, Tailwind CSS, Shadcn UI, and Supabase.

## Features

- 🔐 **Secure Authentication** - Supabase Auth with SSR support
- 🎨 **Modern UI** - Shadcn UI components with Tailwind CSS
- 📱 **Responsive Design** - Mobile-first approach
- 🛠️ **Component Development** - Storybook for isolated component development
- 🔒 **TypeScript** - Full type safety
- ⚡ **Next.js 15** - Latest features with App Router
- 🎯 **Modern React** - Functional components and hooks

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI
- **Authentication**: Supabase Auth (SSR)
- **Database**: Supabase
- **Component Development**: Storybook 8.6
- **Icons**: Lucide React
- **Fonts**: Inter

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### 1. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your project URL and anon key to `.env.local`
4. Enable authentication providers in Authentication → Providers

### 3. Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run Storybook for component development
npm run storybook
```

### 4. Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run storybook    # Start Storybook
npm run build-storybook  # Build Storybook
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Dashboard page
│   └── login/             # Authentication pages
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   └── layout/           # Layout components
├── lib/                   # Utility functions
│   ├── utils.ts          # General utilities
│   └── supabase/         # Supabase clients
└── stories/               # Storybook stories
```

## Authentication Flow

The app uses Supabase Auth with Server-Side Rendering (SSR):

1. **Middleware** (`src/middleware.ts`) - Handles session refresh and redirects
2. **Server Client** (`src/lib/supabase/server.ts`) - For server components
3. **Browser Client** (`src/lib/supabase/client.ts`) - For client components

### Key Features:
- Automatic session refresh
- Protected routes
- Seamless SSR/CSR integration
- Type-safe user management

## Components

### UI Components (Shadcn)
- **Button** - Multiple variants and sizes
- **Card** - Flexible content containers
- **Input** - Form inputs with consistent styling

### Layout Components
- **Navbar** - Responsive navigation with auth state
- **Dashboard** - Main dashboard layout

## Development

### Component Development with Storybook

```bash
npm run storybook
```

Access Storybook at `http://localhost:6006` to develop and test components in isolation.

### Adding New Components

1. Create component in `src/components/ui/`
2. Export from component file
3. Create corresponding `.stories.tsx` file
4. Add to Storybook for development

### Database Integration

The app is ready for Supabase database integration:

1. Define your schema in Supabase Dashboard
2. Use the server client for data fetching in Server Components
3. Use the browser client for mutations in Client Components

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests and stories
5. Submit a pull request

## License

MIT License - see LICENSE file for details
