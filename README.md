# RAG Chatbot Demo Platform

A full-stack application for creating and managing RAG (Retrieval-Augmented Generation) chatbot demos. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Multi-tenant Architecture**: Admin and client roles with role-based access control
- **Bot Management**: Create and manage multiple chatbot instances
- **Knowledge Base**: Upload PDFs, CSVs, text files, or add content via URL
- **Real-time Chat**: Interactive chat interface with message history
- **Demo Mode**: Public-facing chat demos for each bot
- **Integration**: Embed codes for iframe integration
- **Event Logging**: Comprehensive audit trail for all bot operations

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI Integration**: n8n webhooks for RAG processing
- **State Management**: React Context API
- **Validation**: Zod schemas
- **Authentication**: JWT with HttpOnly cookies (simulated in dev)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- n8n instance with webhooks configured

### Environment Variables

The project uses Supabase for the database. The connection details are in `.env`:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Installation

```bash
npm install
```

### Database Setup

The database schema is already created with all necessary tables:

- `clients` - User accounts (admin/client roles)
- `bots` - Chatbot instances
- `datasources` - Knowledge base sources
- `sessions` - Chat sessions
- `messages` - Chat message history
- `events` - Audit logs

### Seed Data

Two demo accounts are pre-configured:

- **Admin**: admin@example.com / password
- **Client**: client@example.com / password

### Development

```bash
npm run dev
```

The app will be available at http://localhost:5173

## Usage

### Admin Workflow

1. Login with admin credentials
2. Create a new bot from the dashboard
3. Add datasources:
   - Upload PDF/CSV/TXT files
   - Add text content directly
   - Add URLs to scrape
4. View integration codes and demo URL
5. Monitor events and activity

### Client Workflow

1. Login with client credentials
2. View assigned bots
3. Access chat interface with read-only knowledge base view

### Demo Mode

Each bot has a public demo URL:
```
/demo/{botId}
```

This provides an embeddable chat interface without authentication.

## API Architecture

The application uses a mock API layer that simulates backend endpoints:

- `/api/auth/*` - Authentication endpoints
- `/api/bots/*` - Bot management
- `/api/sessions` - Chat session creation
- `/api/chat` - Message handling with n8n integration

### n8n Integration

The platform integrates with two n8n webhooks:

1. **Ingest Webhook**: `https://n8n.prcz.fr/webhook/lacroix-ingestdata`
   - Handles document processing and vectorization
   - Updates datasource status after indexing

2. **Chat Webhook**: `https://n8n.prcz.fr/webhook/lacroix-chat`
   - Processes chat messages with RAG
   - Returns answers with source attribution

## Security Features

- Row Level Security (RLS) on all tables
- Role-based access control (admin/client)
- JWT authentication
- Input validation with Zod
- Rate limiting on chat endpoints
- Secure file upload with type validation
- Content deduplication via SHA-1 hashing

## Project Structure

```
src/
├── api/              # API handlers (auth, bots, datasources, chat)
├── components/       # Reusable UI components
├── contexts/         # React contexts (Auth)
├── lib/              # Utilities (supabase, auth, validation)
├── pages/            # Page components
├── server/           # Mock API server
├── App.tsx           # App root with providers
├── Router.tsx        # Client-side routing
└── main.tsx          # Entry point
```

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## License

MIT
