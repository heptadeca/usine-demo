# Guide de déploiement des Edge Functions

Ce guide explique en détail comment déployer les Edge Functions de ce projet sur Supabase.

## Vue d'ensemble

Le projet utilise 5 Edge Functions :

1. **create-admin** - Crée un compte admin (automatique ou manuel)
2. **chat-proxy** - Proxy pour les requêtes chat vers n8n
3. **ingest-datasource** - Ingestion des sources de données vers n8n
4. **delete-datasource** - Suppression des sources de données
5. **download-datasource** - Téléchargement des sources de données

## Méthode 1 : Via l'environnement Bolt (MCP Tool)

Si vous êtes dans un environnement Bolt avec accès à l'outil MCP Supabase, vous pouvez utiliser directement le déploiement intégré.

### Avantages
- Déploiement rapide et automatique
- Pas besoin d'installer le CLI
- Gestion des dépendances automatique

### Instructions

Dans votre environnement Bolt, demandez à l'assistant de déployer chaque fonction :

```
Déploie la fonction create-admin
Déploie la fonction chat-proxy
Déploie la fonction ingest-datasource
Déploie la fonction delete-datasource
Déploie la fonction download-datasource
```

L'assistant utilisera l'outil `mcp__supabase__deploy_edge_function` pour déployer automatiquement.

## Méthode 2 : Via le Dashboard Supabase (Recommandé pour les débutants)

### Étape 1 : Accéder aux Edge Functions

1. Connectez-vous au [Dashboard Supabase](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Dans le menu latéral, cliquez sur **Edge Functions**

### Étape 2 : Créer chaque fonction

Pour chaque fonction, suivez ces étapes :

#### Fonction 1 : create-admin

1. Cliquez sur **"Create a new function"** ou **"+ New function"**
2. Paramètres :
   - **Name** : `create-admin`
   - **Verify JWT** : `false` (fonction publique mais sécurisée par clé)
3. Copiez le code depuis `supabase/functions/create-admin/index.ts`
4. Collez dans l'éditeur
5. Cliquez sur **Deploy**

#### Fonction 2 : chat-proxy

1. Cliquez sur **"Create a new function"**
2. Paramètres :
   - **Name** : `chat-proxy`
   - **Verify JWT** : `true`
3. Copiez le code depuis `supabase/functions/chat-proxy/index.ts`
4. Collez dans l'éditeur
5. Cliquez sur **Deploy**

#### Fonction 3 : ingest-datasource

1. Cliquez sur **"Create a new function"**
2. Paramètres :
   - **Name** : `ingest-datasource`
   - **Verify JWT** : `true`
3. Copiez le code depuis `supabase/functions/ingest-datasource/index.ts`
4. Collez dans l'éditeur
5. Cliquez sur **Deploy**

#### Fonction 4 : delete-datasource

1. Cliquez sur **"Create a new function"**
2. Paramètres :
   - **Name** : `delete-datasource`
   - **Verify JWT** : `true`
3. Copiez le code depuis `supabase/functions/delete-datasource/index.ts`
4. Collez dans l'éditeur
5. Cliquez sur **Deploy**

#### Fonction 5 : download-datasource

1. Cliquez sur **"Create a new function"**
2. Paramètres :
   - **Name** : `download-datasource`
   - **Verify JWT** : `true`
3. Copiez le code depuis `supabase/functions/download-datasource/index.ts`
4. Collez dans l'éditeur
5. Cliquez sur **Deploy**

### Étape 3 : Vérifier le déploiement

1. Dans le Dashboard, allez dans **Edge Functions**
2. Vous devriez voir les 5 fonctions listées
3. Vérifiez que chaque fonction a le statut **"Deployed"** (vert)

## Méthode 3 : Via le Supabase CLI (Pour développeurs)

### Prérequis

1. Installer le Supabase CLI :

```bash
# macOS (via Homebrew)
brew install supabase/tap/supabase

# Windows (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux (via script)
curl -sL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
sudo mv supabase /usr/local/bin/

# Vérifier l'installation
supabase --version
```

### Étape 1 : Se connecter à Supabase

```bash
# Connexion
supabase login

# Cela ouvrira votre navigateur pour l'authentification
```

### Étape 2 : Lier votre projet

```bash
# Remplacez YOUR_PROJECT_REF par votre référence de projet
# (trouvable dans Settings → General → Reference ID)
supabase link --project-ref YOUR_PROJECT_REF
```

### Étape 3 : Déployer les fonctions

```bash
# Déployer toutes les fonctions en une fois
supabase functions deploy create-admin
supabase functions deploy chat-proxy
supabase functions deploy ingest-datasource
supabase functions deploy delete-datasource
supabase functions deploy download-datasource

# Ou déployer toutes les fonctions automatiquement
cd supabase/functions
for func in */; do
  supabase functions deploy "${func%/}"
done
```

### Étape 4 : Vérifier le déploiement

```bash
# Lister toutes les fonctions déployées
supabase functions list
```

## Configuration des variables d'environnement

### Variables automatiques

Ces variables sont **automatiquement disponibles** dans toutes les Edge Functions (pas besoin de les configurer) :

- `SUPABASE_URL` - URL de votre projet
- `SUPABASE_ANON_KEY` - Clé publique
- `SUPABASE_SERVICE_ROLE_KEY` - Clé service (accès complet)
- `SUPABASE_DB_URL` - URL de connexion PostgreSQL

### Variable personnalisée : MASTER_ADMIN_KEY

Pour la fonction `create-admin`, vous devez configurer une clé master personnalisée :

#### Via le Dashboard

1. Allez dans **Edge Functions** → **Settings** (ou **Configuration**)
2. Section **"Environment variables"** ou **"Secrets"**
3. Cliquez sur **"Add new secret"**
4. Paramètres :
   - **Name** : `MASTER_ADMIN_KEY`
   - **Value** : Une clé secrète forte (ex: `MaCleSecrete2025!XYZ`)
5. Cliquez sur **Save**

#### Via le CLI

```bash
# Définir la variable
supabase secrets set MASTER_ADMIN_KEY=MaCleSecrete2025!XYZ

# Vérifier les secrets
supabase secrets list
```

**Important** : Notez cette clé, vous en aurez besoin pour créer des comptes admin supplémentaires.

## Tester les fonctions déployées

### 1. Tester create-admin

**Note** : Cette fonction n'est normalement pas nécessaire car le compte admin est créé automatiquement par la migration. Utilisez-la uniquement pour créer des admins supplémentaires.

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create-admin \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nouvel-admin@example.com",
    "password": "MotDePasseSecurise123!",
    "admin_key": "MaCleSecrete2025!XYZ"
  }'
```

### 2. Tester chat-proxy

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/chat-proxy \
  -H "Authorization: Bearer YOUR_USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Bonjour",
    "bot_id": "YOUR_BOT_ID",
    "session_id": "YOUR_SESSION_ID"
  }'
```

### 3. Tester ingest-datasource

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/ingest-datasource \
  -H "Authorization: Bearer YOUR_USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "datasourceId": "YOUR_DATASOURCE_ID"
  }'
```

## Dépannage

### Erreur : "Function not found"

La fonction n'est pas déployée. Vérifiez dans le Dashboard que la fonction apparaît dans la liste.

### Erreur : "Invalid JWT"

Vérifiez que :
1. La fonction nécessite une authentification (`verify_jwt: true`)
2. Vous passez le bon token dans le header `Authorization: Bearer TOKEN`
3. Le token n'est pas expiré

### Erreur : "Missing environment variable"

Les variables d'environnement standard (`SUPABASE_URL`, etc.) sont automatiques. Si l'erreur concerne `MASTER_ADMIN_KEY`, configurez-la selon les instructions ci-dessus.

### La fonction ne répond pas

1. Vérifiez les logs dans le Dashboard : **Edge Functions** → Cliquez sur la fonction → **Logs**
2. Recherchez les erreurs dans la console
3. Vérifiez que le code est correctement déployé

### Erreur CORS

Si vous appelez la fonction depuis un navigateur et obtenez une erreur CORS :

1. Vérifiez que la fonction gère les requêtes `OPTIONS`
2. Vérifiez que les headers CORS sont présents dans toutes les réponses
3. Toutes les fonctions de ce projet gèrent déjà CORS correctement

### Timeout de la fonction

Les Edge Functions ont un timeout de 60 secondes. Si votre fonction prend plus de temps :

1. Vérifiez les appels API externes (n8n, etc.)
2. Optimisez le code pour réduire le temps d'exécution
3. Envisagez de diviser en plusieurs étapes asynchrones

## URLs des fonctions

Une fois déployées, vos fonctions seront accessibles à ces URLs :

```
https://YOUR_PROJECT.supabase.co/functions/v1/create-admin
https://YOUR_PROJECT.supabase.co/functions/v1/chat-proxy
https://YOUR_PROJECT.supabase.co/functions/v1/ingest-datasource
https://YOUR_PROJECT.supabase.co/functions/v1/delete-datasource
https://YOUR_PROJECT.supabase.co/functions/v1/download-datasource
```

Remplacez `YOUR_PROJECT` par votre référence de projet Supabase.

## Mise à jour des fonctions

### Via Dashboard

1. Allez dans **Edge Functions**
2. Cliquez sur la fonction à mettre à jour
3. Modifiez le code dans l'éditeur
4. Cliquez sur **Deploy** pour redéployer

### Via CLI

```bash
# Redéployer une fonction modifiée
supabase functions deploy nom-de-la-fonction

# Par exemple
supabase functions deploy chat-proxy
```

## Bonnes pratiques

1. **Logs** : Utilisez `console.log()` pour déboguer (visible dans les logs du Dashboard)
2. **Erreurs** : Retournez toujours des objets JSON avec structure `{ error: "message" }`
3. **CORS** : Gérez toujours les requêtes OPTIONS pour le preflight
4. **Sécurité** :
   - Utilisez `verify_jwt: true` pour les fonctions protégées
   - Validez toujours les entrées utilisateur
   - Ne loggez jamais de secrets ou tokens
5. **Performance** :
   - Évitez les appels inutiles à la base de données
   - Utilisez `maybeSingle()` au lieu de `single()` pour éviter les erreurs inutiles
   - Timeoutez les appels externes si nécessaire

## Résumé de la checklist

- [ ] Méthode de déploiement choisie (Dashboard, CLI ou MCP)
- [ ] Les 5 fonctions sont déployées
- [ ] Variable `MASTER_ADMIN_KEY` configurée
- [ ] Fonctions testées (au moins `create-admin`)
- [ ] Logs vérifiés (pas d'erreur)
- [ ] URLs des fonctions notées
- [ ] Documentation lue

Temps estimé : **10-15 minutes** (Dashboard) ou **5 minutes** (CLI)

## Support

Pour plus d'informations :
- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Exemples officiels](https://github.com/supabase/supabase/tree/master/examples/edge-functions)
- Logs dans le Dashboard pour le débogage
