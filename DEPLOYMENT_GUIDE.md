# Guide de déploiement - Comment dupliquer ce projet

Ce guide explique comment déployer ce projet sur une nouvelle instance Bolt avec une nouvelle base de données Supabase.

## Prérequis

- Un compte Supabase
- Un nouveau projet Bolt
- Les fichiers de ce projet (code source)

## Étapes de déploiement

### 1. Créer un nouveau projet Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Cliquez sur "New Project"
3. Donnez un nom à votre projet
4. Choisissez une région proche de vos utilisateurs
5. Définissez un mot de passe fort pour la base de données
6. Attendez que le projet soit créé (2-3 minutes)

### 2. Récupérer les identifiants Supabase

Une fois le projet créé :

1. Allez dans **Settings** → **API**
2. Notez les informations suivantes :
   - **Project URL** (commence par `https://...supabase.co`)
   - **anon/public key** (clé publique)
   - **service_role key** (clé secrète - NE PAS exposer côté client)

### 3. Créer le projet Bolt

1. Créez un nouveau projet sur Bolt
2. Copiez tous les fichiers du projet actuel vers le nouveau projet Bolt
3. Assurez-vous que tous les dossiers sont copiés :
   - `src/`
   - `public/`
   - `supabase/`
   - Fichiers de configuration (package.json, tsconfig.json, etc.)

### 4. Configurer les variables d'environnement

Dans votre nouveau projet Bolt, créez/modifiez le fichier `.env` :

```bash
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key_ici
```

**Important** : Remplacez les valeurs par celles de votre nouveau projet Supabase (étape 2).

### 5. Appliquer les migrations de base de données

Les migrations doivent être appliquées dans l'ordre. Vous avez deux options :

#### Option A : Via le SQL Editor de Supabase (recommandé)

1. Allez dans votre projet Supabase → **SQL Editor**
2. Appliquez les migrations **dans cet ordre exact** :

```sql
-- 1. Créer le schéma principal
-- Copiez le contenu de : supabase/migrations/20251010090617_create_rag_chatbot_schema.sql

-- 2. Mettre à jour les politiques d'accès
-- Copiez le contenu de : supabase/migrations/20251010095158_add_bot_client_access.sql

-- 3. Créer le bucket de stockage
-- Copiez le contenu de : supabase/migrations/20251013081123_create_storage_bucket_for_datasources.sql

-- 4. Ajouter la clé API aux bots
-- Copiez le contenu de : supabase/migrations/20251013083438_add_api_key_to_bots.sql

-- 5. Mettre à jour les politiques RLS
-- Copiez le contenu de : supabase/migrations/20251013085652_update_rls_for_client_bot_access.sql

-- 6. Ajouter le prompt aux bots
-- Copiez le contenu de : supabase/migrations/20251024131519_add_prompt_to_bots.sql

-- 7. Ajouter l'accès anonyme au chat
-- Copiez le contenu de : supabase/migrations/20251030132935_add_anonymous_chat_access.sql

-- 8. Corriger les problèmes de performance
-- Copiez le contenu de : supabase/migrations/20251030135652_fix_security_performance_issues.sql

-- 9. Corriger la récursion infinie
-- Copiez le contenu de : supabase/migrations/20251030135915_fix_infinite_recursion_in_policies.sql

-- 10. Configurer le système d'authentification
-- Copiez le contenu de : supabase/migrations/fix_admin_authentication_system.sql

-- 11. Créer le compte admin par défaut
-- Copiez le contenu de : supabase/migrations/setup_default_admin_account.sql
```

**Note** : Après chaque migration, vérifiez qu'il n'y a pas d'erreur avant de passer à la suivante.

#### Option B : Via l'outil MCP (si disponible dans votre environnement)

Si vous avez accès à l'outil MCP Supabase dans votre environnement Bolt :

```bash
# Appliquez chaque migration dans l'ordre avec mcp__supabase__apply_migration
```

### 6. Déployer les Edge Functions

Les Edge Functions doivent être déployées pour le bon fonctionnement de l'application :

1. **create-admin** - Création sécurisée de comptes admin
2. **chat-proxy** - Proxy pour les requêtes chat vers n8n
3. **ingest-datasource** - Ingestion des sources de données
4. **delete-datasource** - Suppression des sources de données
5. **download-datasource** - Téléchargement des sources de données

#### Via le Supabase CLI (recommandé)

Si vous avez installé le [Supabase CLI](https://supabase.com/docs/guides/cli) :

```bash
# Connectez-vous à votre projet
supabase login
supabase link --project-ref votre-projet-ref

# Déployez les fonctions
supabase functions deploy create-admin
supabase functions deploy chat-proxy
supabase functions deploy ingest-datasource
supabase functions deploy delete-datasource
supabase functions deploy download-datasource
```

#### Via le Dashboard Supabase

1. Allez dans **Edge Functions**
2. Cliquez sur "Create a new function"
3. Pour chaque fonction :
   - Nom : nom de la fonction (ex: `create-admin`)
   - Copiez le code depuis `supabase/functions/[nom-fonction]/index.ts`
   - Sauvegardez et déployez

### 7. Configurer les variables d'environnement Edge Functions

Pour la fonction `create-admin`, configurez la clé master :

1. Supabase Dashboard → **Edge Functions** → **Settings**
2. Ajoutez la variable d'environnement :
   - Nom : `MASTER_ADMIN_KEY`
   - Valeur : Une clé secrète forte et unique (ex: `maCleSecrete123!XYZ`)

**Important** : Notez cette clé, vous en aurez besoin pour créer des admins supplémentaires.

### 8. Installer les dépendances npm

Dans votre projet Bolt, installez les dépendances :

```bash
npm install
```

### 9. Vérifier la configuration

Vérifiez que tout est en place :

```bash
# Les variables d'environnement sont définies
cat .env

# Le projet compile sans erreur
npm run build
```

### 10. Tester l'authentification

1. Lancez l'application (dans Bolt, elle démarre automatiquement)
2. Allez sur la page de connexion
3. Connectez-vous avec le compte admin par défaut :
   - **Email** : `admin@demo.com`
   - **Mot de passe** : `Adm1n$ecur3!2025`
4. Vous devriez accéder au dashboard admin

### 11. Sécuriser l'installation (IMPORTANT)

**Pour une utilisation en production** :

1. **Changez le mot de passe admin** :
   ```sql
   UPDATE auth.users
   SET encrypted_password = crypt('VotreNouveauMotDePasse', gen_salt('bf'))
   WHERE email = 'admin@demo.com';
   ```

2. **Vérifiez les politiques RLS** :
   ```sql
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public';
   ```

3. **Limitez l'accès au bucket Storage** :
   - Vérifiez les politiques dans Storage → Policies

4. **Changez MASTER_ADMIN_KEY** :
   - Utilisez une clé vraiment aléatoire et longue

## Vérification finale

Checklist pour confirmer que tout fonctionne :

- [ ] Connexion admin réussie
- [ ] Création d'un bot réussie
- [ ] Upload d'une datasource réussie
- [ ] Chat avec le bot fonctionnel
- [ ] Politiques RLS actives (vérifier que les clients ne voient que leurs bots)
- [ ] Edge Functions déployées et accessibles

## Dépannage

### Erreur "Missing Supabase environment variables"

Vérifiez que le fichier `.env` existe et contient les bonnes variables :
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Erreur lors de la connexion admin

Vérifiez que la migration `setup_default_admin_account` a bien été exécutée :
```sql
SELECT * FROM clients WHERE email = 'admin@demo.com';
SELECT email FROM auth.users WHERE email = 'admin@demo.com';
```

### Les Edge Functions ne répondent pas

Vérifiez qu'elles sont bien déployées :
1. Supabase Dashboard → Edge Functions
2. Vérifiez le statut de chaque fonction
3. Consultez les logs pour voir les erreurs

### Erreur de permission RLS

Vérifiez que la fonction `is_admin()` existe :
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'is_admin';
```

Si elle n'existe pas, réappliquez les migrations concernées.

## Support

Pour plus d'informations :

- **Documentation Supabase** : [https://supabase.com/docs](https://supabase.com/docs)
- **Configuration admin** : Voir `ADMIN_SETUP.md`
- **Tests** : Voir `TESTING_GUIDE.md`

## Notes importantes

1. **Les migrations sont idempotentes** : Vous pouvez les réexécuter sans problème
2. **L'ordre des migrations est crucial** : Respectez l'ordre indiqué
3. **Le compte admin est créé automatiquement** : Pas besoin de le créer manuellement
4. **Les Edge Functions nécessitent le Service Role Key** : Automatiquement disponible
5. **Les URLs n8n** : Doivent être configurées dans chaque bot créé

## Checklist de déploiement rapide

Pour un déploiement rapide, suivez cette liste :

1. ✅ Créer projet Supabase
2. ✅ Noter URL et clés API
3. ✅ Copier fichiers dans nouveau Bolt
4. ✅ Créer `.env` avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
5. ✅ Appliquer migrations (SQL Editor)
6. ✅ Déployer Edge Functions
7. ✅ Configurer MASTER_ADMIN_KEY
8. ✅ `npm install`
9. ✅ Tester connexion admin
10. ✅ Changer mot de passe admin en production

Temps estimé : **20-30 minutes**
