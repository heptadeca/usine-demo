# Documentation Complète - Plateforme de Chatbot RAG

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Installation et Configuration](#installation-et-configuration)
4. [Guide Utilisateur](#guide-utilisateur)
5. [Guide Développeur](#guide-développeur)
6. [Base de données](#base-de-données)
7. [API et Intégrations](#api-et-intégrations)
8. [Sécurité](#sécurité)
9. [Déploiement](#déploiement)

---

## Vue d'ensemble

### Description

Plateforme complète de gestion de chatbots RAG (Retrieval-Augmented Generation) permettant de créer, gérer et déployer des assistants intelligents alimentés par vos propres données.

### Fonctionnalités principales

- **Gestion multi-bots**: Créez et gérez plusieurs chatbots indépendants
- **Sources de données variées**: PDF, CSV, TXT, texte direct, URLs
- **Modes d'affichage multiples**: Bulle de chat, plein écran, widget intégré
- **Interface responsive**: Optimisée pour mobile, tablette et desktop
- **Authentification sécurisée**: Système de rôles (admin/client)
- **Accès public**: URLs de démo sans authentification
- **Traçabilité complète**: Logs d'événements et historique des conversations

### Technologies utilisées

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Edge Functions)
- **AI/ML**: n8n workflows pour le traitement RAG
- **Validation**: Zod
- **Icons**: Lucide React

---

## Architecture

### Architecture globale

```
┌─────────────────┐
│   Client Web    │
│  (React + TS)   │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌─────────────┐  ┌─────────────────┐
│  Supabase   │  │  Edge Functions │
│   Database  │  │   (Deno + TS)   │
│     +       │  └────────┬────────┘
│   Storage   │           │
└─────────────┘           ▼
                   ┌──────────────┐
                   │ n8n Webhooks │
                   │  (RAG Flow)  │
                   └──────────────┘
```

### Structure du projet

```
project/
├── src/
│   ├── api/                    # Couche API
│   │   ├── auth.ts            # Authentification
│   │   ├── bots.ts            # Gestion des bots
│   │   ├── datasources.ts    # Gestion des sources
│   │   └── chat.ts            # Communication chat
│   │
│   ├── components/            # Composants React
│   │   ├── ChatBubble.tsx    # Bulle de chat flottante
│   │   ├── WhatsAppChat.tsx  # Chat plein écran
│   │   ├── EmbeddedChat.tsx  # Widget intégré
│   │   ├── Navbar.tsx        # Barre de navigation
│   │   └── ProtectedRoute.tsx # Routes protégées
│   │
│   ├── contexts/              # Contextes React
│   │   └── AuthContext.tsx   # Contexte d'authentification
│   │
│   ├── lib/                   # Utilitaires
│   │   ├── supabase.ts       # Client Supabase
│   │   ├── auth.ts           # Helpers auth
│   │   └── validation.ts     # Schémas Zod
│   │
│   ├── pages/                 # Pages de l'application
│   │   ├── LoginPage.tsx     # Connexion
│   │   ├── AdminDashboard.tsx # Dashboard admin
│   │   ├── ClientDashboard.tsx # Dashboard client
│   │   ├── BotManagePage.tsx # Gestion d'un bot
│   │   ├── ChatModesPage.tsx # Sélection mode d'affichage
│   │   ├── ClientPage.tsx    # Vue client d'un bot
│   │   └── DemoPage.tsx      # Démo publique
│   │
│   ├── App.tsx               # Point d'entrée app
│   ├── Router.tsx            # Routage client-side
│   └── main.tsx              # Point d'entrée React
│
├── supabase/
│   ├── migrations/           # Migrations SQL
│   │   └── *.sql            # Scripts de migration
│   │
│   └── functions/            # Edge Functions
│       ├── chat-proxy/      # Proxy pour n8n chat
│       ├── ingest-datasource/ # Ingestion données
│       ├── delete-datasource/ # Suppression source
│       ├── download-datasource/ # Téléchargement
│       ├── create-admin/    # Création admin
│       └── create-client/   # Création client
│
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Installation et Configuration

### Prérequis

- Node.js 18+
- npm ou yarn
- Compte Supabase
- Instance n8n (optionnel, pour le RAG complet)

### Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd project
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration Supabase**

Créez un fichier `.env` à la racine:

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme
```

4. **Appliquer les migrations**

Les migrations Supabase sont dans `supabase/migrations/`. Elles créent:
- Tables de base de données
- Politiques RLS (Row Level Security)
- Bucket de stockage
- Utilisateurs de test

5. **Déployer les Edge Functions**

Utilisez les outils MCP Supabase pour déployer les fonctions:
- `chat-proxy`
- `ingest-datasource`
- `delete-datasource`
- `download-datasource`
- `create-admin`
- `create-client`

6. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

### Comptes de test

Deux comptes sont créés automatiquement:

- **Admin**
  - Email: `admin@example.com`
  - Mot de passe: `password`

- **Client**
  - Email: `client@example.com`
  - Mot de passe: `password`

---

## Guide Utilisateur

### Interface Administrateur

#### 1. Connexion
- Accédez à l'application
- Connectez-vous avec un compte admin
- Vous êtes redirigé vers le dashboard admin

#### 2. Dashboard Admin
- Vue d'ensemble de tous les bots
- Statistiques (nombre de bots, sources de données)
- Bouton "Créer un Bot"
- Liste des bots existants

#### 3. Créer un Bot

**Étape 1: Informations de base**
- Nom du bot
- Description
- Statut (brouillon/actif)
- Prompt système (instructions pour l'IA)

**Étape 2: Ajouter des sources de données**

Plusieurs options disponibles:
- **Upload de fichier**: PDF, CSV, TXT (max 10 MB)
- **Texte direct**: Coller du contenu texte
- **URL**: Scraper une page web

Chaque source est:
1. Uploadée sur Supabase Storage
2. Envoyée à n8n pour vectorisation
3. Indexée dans la base vectorielle
4. Marquée comme "indexée" dans la BDD

**Étape 3: Configuration des accès**
- Assigner des clients autorisés
- Générer une clé API unique
- Obtenir l'URL de démo publique

#### 4. Gestion d'un Bot

**Onglet Sources de données**
- Liste toutes les sources
- Statut d'indexation (en attente/indexé)
- Actions: télécharger, supprimer
- Ajouter de nouvelles sources

**Onglet Accès Clients**
- Gérer les clients autorisés
- Ajouter/retirer des accès
- Voir les clients actifs

**Onglet Intégration**
- URL de démo: `/demo/{botId}`
- Code iframe pour intégration
- Clé API du bot

**Onglet Logs**
- Événements système
- Actions utilisateurs
- Erreurs et warnings

#### 5. Gestion des Utilisateurs

Utilisez les Edge Functions:
- `create-admin`: Créer un administrateur
- `create-client`: Créer un client

### Interface Client

#### 1. Dashboard Client
- Vue des bots auxquels le client a accès
- Statut de chaque bot (actif/brouillon)
- Clic sur un bot pour démarrer une conversation

#### 2. Sélection du Mode d'Affichage

Trois modes disponibles:

**Bulle de Chat**
- Bouton flottant en bas à droite
- S'ouvre en fenêtre de chat
- Discret et non intrusif
- Parfait pour support client

**Plein Écran**
- Interface type WhatsApp
- Vue immersive
- Historique des messages
- Idéal pour conversations longues

**Widget Intégré**
- S'intègre dans le contenu de la page
- Design personnalisable
- Parfait pour FAQ ou centre d'aide

#### 3. Conversation

**Envoi de messages**
- Tapez votre message
- Appuyez sur Entrée ou cliquez sur Envoyer
- Le message est envoyé au bot
- Réponse générée par l'IA RAG

**Affichage des réponses**
- Message de l'utilisateur (aligné à droite)
- Réponse du bot (aligné à gauche)
- Sources citées (si disponibles)
- Timestamp

### Mode Démo Public

#### Accès
Chaque bot dispose d'une URL publique:
```
https://votre-domaine.com/demo/{botId}
```

#### Fonctionnalités
- Aucune authentification requise
- Session anonyme automatique
- Accès en lecture seule
- Interface simplifiée
- Parfait pour tester ou partager

---

## Guide Développeur

### Ajouter une nouvelle page

1. Créez le composant dans `src/pages/`:
```tsx
// src/pages/MaNouvellePage.tsx
export function MaNouvellePage() {
  return (
    <div>
      <h1>Ma Nouvelle Page</h1>
    </div>
  );
}
```

2. Ajoutez la route dans `src/Router.tsx`:
```tsx
if (currentPath === '/ma-route') {
  return <MaNouvellePage />;
}
```

### Créer un nouveau composant

```tsx
// src/components/MonComposant.tsx
import { useState } from 'react';

type MonComposantProps = {
  title: string;
  onAction: () => void;
};

export function MonComposant({ title, onAction }: MonComposantProps) {
  const [state, setState] = useState(false);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold">{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
}
```

### Utiliser Supabase

```tsx
import { supabase } from '../lib/supabase';

// Lire des données
const { data, error } = await supabase
  .from('bots')
  .select('*')
  .eq('status', 'ready');

// Insérer des données
const { data, error } = await supabase
  .from('bots')
  .insert({ name: 'Mon Bot', status: 'draft' });

// Mettre à jour
const { data, error } = await supabase
  .from('bots')
  .update({ status: 'ready' })
  .eq('id', botId);

// Supprimer
const { data, error } = await supabase
  .from('bots')
  .delete()
  .eq('id', botId);
```

### Créer une Edge Function

1. Créez le fichier:
```typescript
// supabase/functions/ma-fonction/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { param } = await req.json();

    // Votre logique ici
    const result = { success: true, data: param };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

2. Déployez avec l'outil MCP Supabase

### Styling avec Tailwind

```tsx
// Classes responsive
<div className="text-sm sm:text-base lg:text-lg">
  Texte responsive
</div>

// Grille responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Contenu */}
</div>

// Padding responsive
<div className="p-4 sm:p-6 lg:p-8">
  {/* Contenu */}
</div>

// États hover et focus
<button className="bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
  Bouton
</button>
```

### Validation avec Zod

```typescript
import { z } from 'zod';

// Définir un schéma
const botSchema = z.object({
  name: z.string().min(3).max(100),
  status: z.enum(['draft', 'ready']),
  prompt: z.string().optional(),
});

// Valider des données
try {
  const validData = botSchema.parse(data);
  // Données valides
} catch (error) {
  // Erreurs de validation
  console.error(error.errors);
}
```

---

## Base de données

### Schéma des tables

#### Table: `clients`
Stocke les utilisateurs (admins et clients)

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| email | text | Email (unique) |
| password_hash | text | Hash bcrypt du mot de passe |
| role | text | 'admin' ou 'client' |
| created_at | timestamptz | Date de création |

**RLS Policies:**
- Les utilisateurs peuvent voir leur propre profil
- Seuls les admins peuvent voir tous les profils

#### Table: `bots`
Stocke les chatbots

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| name | text | Nom du bot |
| description | text | Description |
| status | text | 'draft' ou 'ready' |
| api_key | text | Clé API unique |
| prompt | text | Prompt système |
| n8n_ingest_url | text | URL webhook n8n ingest |
| n8n_chat_url | text | URL webhook n8n chat |
| created_at | timestamptz | Date de création |
| created_by | uuid | ID du créateur |

**RLS Policies:**
- Admins: accès complet
- Clients: lecture des bots assignés uniquement

#### Table: `datasources`
Stocke les sources de données

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| bot_id | uuid | ID du bot parent |
| name | text | Nom de la source |
| type | text | 'file', 'text', 'url' |
| content | text | Contenu textuel |
| file_url | text | URL du fichier (Storage) |
| file_path | text | Chemin Storage |
| file_type | text | Type MIME |
| file_size | integer | Taille en octets |
| content_hash | text | Hash SHA-1 du contenu |
| status | text | 'pending' ou 'indexed' |
| error_message | text | Message d'erreur éventuel |
| created_at | timestamptz | Date de création |

**RLS Policies:**
- Admins: accès complet
- Clients: lecture des sources de leurs bots assignés

#### Table: `bot_client_access`
Table de liaison bot-client

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| bot_id | uuid | ID du bot |
| client_id | uuid | ID du client |
| created_at | timestamptz | Date d'attribution |

**RLS Policies:**
- Admins: accès complet
- Clients: voir leurs propres accès

#### Table: `sessions`
Stocke les sessions de chat

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| bot_id | uuid | ID du bot |
| client_id | uuid | ID du client (nullable pour anonyme) |
| created_at | timestamptz | Date de création |
| last_activity | timestamptz | Dernière activité |

**RLS Policies:**
- Sessions publiques accessibles par tous
- Sessions privées: par le créateur uniquement

#### Table: `messages`
Stocke les messages de chat

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| session_id | uuid | ID de la session |
| role | text | 'user' ou 'assistant' |
| content | text | Contenu du message |
| sources | jsonb | Sources citées (si applicable) |
| created_at | timestamptz | Date de création |

**RLS Policies:**
- Accessible via la session parente

#### Table: `events`
Logs d'événements système

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| bot_id | uuid | ID du bot |
| type | text | Type d'événement |
| message | text | Message descriptif |
| metadata | jsonb | Données additionnelles |
| created_at | timestamptz | Date de création |

**RLS Policies:**
- Admins: accès complet
- Clients: voir les événements de leurs bots

### Storage Bucket: `datasources`

Configuration:
- Public: Non
- Taille max: 10 MB par fichier
- Types acceptés: PDF, CSV, TXT

**Policies:**
- Upload: Admins uniquement
- Download: Admins et clients avec accès au bot

---

## API et Intégrations

### Edge Functions Supabase

#### 1. `chat-proxy`
Proxy pour les requêtes de chat vers n8n

**Endpoint:** `/functions/v1/chat-proxy`

**Méthode:** POST

**Body:**
```json
{
  "botId": "uuid",
  "sessionId": "uuid",
  "message": "Message de l'utilisateur"
}
```

**Réponse:**
```json
{
  "answer": "Réponse du bot",
  "sources": [
    {
      "title": "Source 1",
      "url": "https://..."
    }
  ]
}
```

#### 2. `ingest-datasource`
Ingestion d'une source de données vers n8n

**Endpoint:** `/functions/v1/ingest-datasource`

**Méthode:** POST

**Body:**
```json
{
  "datasourceId": "uuid",
  "botId": "uuid",
  "content": "Contenu textuel ou URL du fichier"
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Source ingérée avec succès"
}
```

#### 3. `delete-datasource`
Suppression d'une source

**Endpoint:** `/functions/v1/delete-datasource`

**Méthode:** POST

**Body:**
```json
{
  "datasourceId": "uuid"
}
```

#### 4. `download-datasource`
Téléchargement d'une source

**Endpoint:** `/functions/v1/download-datasource`

**Méthode:** GET

**Query params:**
```
?datasourceId=uuid
```

#### 5. `create-admin`
Création d'un administrateur

**Endpoint:** `/functions/v1/create-admin`

**Méthode:** POST

**Body:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

#### 6. `create-client`
Création d'un client

**Endpoint:** `/functions/v1/create-client`

**Méthode:** POST

**Body:**
```json
{
  "email": "client@example.com",
  "password": "password"
}
```

### Intégration n8n

#### Webhook 1: Ingest Data
**URL:** `https://n8n.prcz.fr/webhook/lacroix-ingestdata`

**Payload:**
```json
{
  "botId": "uuid",
  "datasourceId": "uuid",
  "type": "file|text|url",
  "content": "contenu ou URL"
}
```

**Traitement:**
1. Récupère le contenu
2. Chunking (découpage en segments)
3. Génération d'embeddings
4. Stockage en base vectorielle (Pinecone/Qdrant)
5. Callback vers Supabase pour update du statut

#### Webhook 2: Chat
**URL:** `https://n8n.prcz.fr/webhook/lacroix-chat`

**Payload:**
```json
{
  "botId": "uuid",
  "sessionId": "uuid",
  "message": "Question de l'utilisateur",
  "history": [
    {
      "role": "user",
      "content": "Message précédent"
    }
  ]
}
```

**Traitement:**
1. Vectorisation de la question
2. Recherche de similarité dans la base vectorielle
3. Récupération des chunks pertinents
4. Construction du contexte
5. Appel au LLM (OpenAI/Anthropic)
6. Retour de la réponse avec sources

---

## Sécurité

### Authentification

- Hash des mots de passe avec bcrypt (10 rounds)
- Sessions via JWT
- Expiration automatique après inactivité
- Politique de mots de passe forts (recommandé)

### Row Level Security (RLS)

Toutes les tables ont des politiques RLS:

**Principe:**
- Par défaut, aucun accès
- Policies explicites pour chaque opération (SELECT, INSERT, UPDATE, DELETE)
- Vérification du rôle utilisateur
- Vérification de l'ownership ou de l'accès

**Exemple:**
```sql
-- Les clients ne peuvent voir que leurs bots assignés
CREATE POLICY "Clients can view assigned bots"
  ON bots FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT client_id
      FROM bot_client_access
      WHERE bot_id = bots.id
    )
  );
```

### Validation des entrées

- Tous les inputs sont validés avec Zod
- Sanitization des données utilisateur
- Vérification des types MIME pour les uploads
- Limite de taille des fichiers (10 MB)
- Rate limiting sur les endpoints sensibles

### Protection CORS

Toutes les Edge Functions implémentent:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
```

### Secrets et Variables

- Toutes les clés API dans des variables d'environnement
- Jamais de secrets dans le code source
- Rotation régulière des clés (recommandé)

---

## Déploiement

### Build de production

```bash
npm run build
```

Le build génère le dossier `dist/` avec:
- HTML minifié
- CSS optimisé
- JavaScript bundlé et minifié
- Assets optimisés

### Déploiement sur Vercel

1. Connectez votre repository GitHub
2. Configurez les variables d'environnement:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Déployez automatiquement à chaque push

### Déploiement sur Netlify

1. Connectez votre repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Ajoutez les variables d'environnement

### Déploiement des Edge Functions

Utilisez les outils MCP Supabase ou la CLI Supabase:

```bash
supabase functions deploy chat-proxy
supabase functions deploy ingest-datasource
supabase functions deploy delete-datasource
supabase functions deploy download-datasource
supabase functions deploy create-admin
supabase functions deploy create-client
```

### Configuration DNS

Pour un domaine personnalisé:
1. Ajoutez un enregistrement A ou CNAME
2. Configurez SSL/TLS (Let's Encrypt)
3. Mettez à jour les CORS si nécessaire

### Monitoring

Recommandations:
- Logs Supabase pour surveiller les requêtes
- Monitoring n8n pour les workflows
- Alertes sur les erreurs critiques
- Métriques de performance (Vercel Analytics, etc.)

---

## Maintenance et Évolutions

### Mises à jour de dépendances

```bash
# Vérifier les mises à jour
npm outdated

# Mettre à jour
npm update

# Mise à jour majeure
npm install package@latest
```

### Backup de la base de données

Supabase propose des backups automatiques:
- Daily backups (selon le plan)
- Point-in-time recovery
- Export manuel via SQL ou Supabase CLI

### Ajout de nouvelles fonctionnalités

1. Créez une branche feature
2. Développez et testez localement
3. Créez une migration SQL si nécessaire
4. Testez en staging
5. Déployez en production
6. Documentez les changements

### Support et Contact

Pour toute question ou problème:
- Ouvrez une issue sur GitHub
- Consultez la documentation Supabase
- Consultez la documentation n8n

---

## Annexes

### Glossaire

- **RAG**: Retrieval-Augmented Generation - Technique d'IA combinant recherche et génération
- **Embedding**: Représentation vectorielle d'un texte
- **Chunking**: Découpage d'un document en segments
- **RLS**: Row Level Security - Sécurité au niveau des lignes SQL
- **Edge Function**: Fonction serverless exécutée en périphérie

### Commandes utiles

```bash
# Développement
npm run dev

# Build
npm run build

# Linting
npm run lint

# Type checking
npm run typecheck

# Preview du build
npm run preview
```

### Ressources

- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [n8n Documentation](https://docs.n8n.io)
- [Vite Documentation](https://vitejs.dev)

---

**Version:** 1.0.0
**Dernière mise à jour:** 2025-11-04
**Auteur:** Équipe de développement
