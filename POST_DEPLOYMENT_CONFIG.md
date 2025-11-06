# Configuration post-déploiement

Ce document liste **TOUTES** les configurations nécessaires après avoir dupliqué le projet pour que **100% des fonctionnalités** fonctionnent.

## ✅ Ce qui fonctionne automatiquement (0 configuration)

1. **Authentification complète**
   - Compte admin créé automatiquement : `admin@demo.com` / `Adm1n$ecur3!2025`
   - Connexion/déconnexion
   - Gestion des sessions et rôles

2. **Base de données**
   - Toutes les tables créées avec RLS
   - Triggers et fonctions configurés
   - Storage bucket `datasources` créé

3. **Interface utilisateur**
   - Dashboard admin
   - Dashboard client
   - Pages de gestion des bots
   - Interfaces de chat (Widget, WhatsApp, Embedded)

## ⚠️ Configuration OBLIGATOIRE (sinon ça ne fonctionne pas)

### 1. URLs n8n - CRITIQUE ⛔

**Problème** : Le projet est configuré pour utiliser `https://n8n.prcz.fr` qui est probablement **votre** instance n8n privée. Sur un nouveau déploiement, ces URLs ne fonctionneront pas.

**Impact** :
- ❌ Le chat ne fonctionnera pas
- ❌ L'ingestion de datasources ne fonctionnera pas
- ❌ La suppression de datasources ne fonctionnera pas

**Fichiers à modifier** :

#### a) Edge Function : chat-proxy

**Fichier** : `supabase/functions/chat-proxy/index.ts`

```typescript
// Ligne 70 - MODIFIER CETTE LIGNE
const n8nUrl = 'https://VOTRE-N8N.com/webhook/lacroix-chat';
```

#### b) Edge Function : delete-datasource

**Fichier** : `supabase/functions/delete-datasource/index.ts`

```typescript
// Ligne 59 - MODIFIER CETTE LIGNE
const webhookResponse = await fetch('https://VOTRE-N8N.com/webhook/lacroix-deletedata', {
```

#### c) Frontend : Constantes par défaut

**Fichier** : `src/api/bots.ts`

```typescript
// Lignes 5-6 - MODIFIER CES LIGNES
const N8N_INGEST_URL = 'https://VOTRE-N8N.com/webhook/lacroix-ingestdata';
const N8N_CHAT_URL = 'https://VOTRE-N8N.com/webhook/lacroix-chat';
```

#### d) Frontend : Fallbacks dans les composants

**Fichier** : `src/components/ChatWidget.tsx`

```typescript
// Lignes 85 et 193 - MODIFIER CES LIGNES
const chatUrl = bot.n8n_chat_url || 'https://VOTRE-N8N.com/webhook/lacroix-chat';
```

**Fichier** : `src/components/WhatsAppChat.tsx`

```typescript
// Ligne 83 - MODIFIER CETTE LIGNE
const chatUrl = bot.n8n_chat_url || 'https://VOTRE-N8N.com/webhook/lacroix-chat';
```

**Fichier** : `src/api/chat.ts`

```typescript
// Ligne 100 - MODIFIER CETTE LIGNE
const chatUrl = bot.n8n_chat_url || 'https://VOTRE-N8N.com/webhook/lacroix-chat';
```

**Fichier** : `src/pages/AdminDashboard.tsx`

```typescript
// Lignes 76-77 - MODIFIER CES LIGNES
n8n_ingest_url: 'https://VOTRE-N8N.com/webhook/lacroix-ingestdata',
n8n_chat_url: 'https://VOTRE-N8N.com/webhook/lacroix-chat',
```

**Solution rapide** : Effectuer un "Search & Replace" dans tout le projet :
- Chercher : `https://n8n.prcz.fr`
- Remplacer par : `https://VOTRE-N8N.com`

### 2. Workflows n8n - CRITIQUE ⛔

**Problème** : Le projet nécessite des workflows n8n configurés pour fonctionner.

**Impact** :
- ❌ Sans workflows n8n, le chat ne répondra pas
- ❌ L'ingestion de données échouera

**Workflows requis** :

1. **Webhook d'ingestion** : `/webhook/lacroix-ingestdata`
   - Reçoit les fichiers/textes/URLs
   - Parse et vectorise le contenu
   - Stocke dans une base vectorielle (Pinecone, Qdrant, etc.)

2. **Webhook de chat** : `/webhook/lacroix-chat`
   - Reçoit les messages utilisateur
   - Recherche dans la base vectorielle
   - Génère une réponse via LLM (OpenAI, etc.)
   - Retourne la réponse

3. **Webhook de suppression** : `/webhook/lacroix-deletedata`
   - Supprime les données vectorisées d'une datasource

**Actions nécessaires** :
1. Créer/configurer ces workflows dans votre instance n8n
2. Tester chaque webhook individuellement
3. Mettre à jour les URLs dans le projet (voir point 1)

### 3. Variable d'environnement Edge Function

**Fichier** : Configuration Supabase

**Variable à ajouter** :
- **Nom** : `MASTER_ADMIN_KEY`
- **Valeur** : Une clé secrète forte (ex: `MonSecretAdmin2025!XYZ`)
- **Où** : Dashboard Supabase → Edge Functions → Settings → Secrets

**Impact si non configuré** :
- ❌ Impossible de créer des comptes admin supplémentaires via l'API
- ✅ Le compte admin par défaut fonctionnera quand même

## ⚙️ Configurations optionnelles (recommandées)

### 1. Changer le mot de passe admin par défaut

**Pour la production**, changez le mot de passe :

```sql
UPDATE auth.users
SET encrypted_password = crypt('VotreNouveauMotDePasseTresFort!', gen_salt('bf'))
WHERE email = 'admin@demo.com';
```

### 2. Configurer CORS si nécessaire

Si vous déployez le frontend sur un domaine personnalisé, vérifiez les politiques CORS dans :
- Edge Functions (déjà configuré pour `*`)
- Supabase Storage (vérifier les politiques)

### 3. Limites de Storage

Par défaut, le bucket `datasources` accepte des fichiers jusqu'à 50MB. Pour modifier :

1. Dashboard Supabase → Storage → datasources → Settings
2. Ajuster la taille max si nécessaire

## 📋 Checklist de vérification post-déploiement

Testez ces fonctionnalités pour confirmer que tout fonctionne :

### Tests d'authentification
- [ ] Connexion avec `admin@demo.com` / `Adm1n$ecur3!2025`
- [ ] Accès au dashboard admin
- [ ] Déconnexion
- [ ] Reconnexion

### Tests de gestion des bots
- [ ] Créer un nouveau bot
- [ ] Modifier les URLs n8n du bot
- [ ] Voir la liste des bots
- [ ] Accéder aux détails d'un bot

### Tests de datasources
- [ ] Upload d'un fichier PDF
- [ ] Upload d'un fichier CSV
- [ ] Ajout d'une URL
- [ ] Ajout de texte brut
- [ ] Statut passe de "new" à "indexed" (nécessite n8n fonctionnel)
- [ ] Suppression d'une datasource

### Tests de chat
- [ ] Ouvrir le widget de chat
- [ ] Envoyer un message
- [ ] Recevoir une réponse (nécessite n8n fonctionnel)
- [ ] Vérifier l'historique des messages

### Tests d'accès client
- [ ] Créer un compte client (via admin)
- [ ] Se connecter en tant que client
- [ ] Voir uniquement les bots autorisés
- [ ] Impossible d'accéder aux bots d'autres clients

## 🚨 Scénarios de panne

### "Le chat ne répond pas"

**Causes possibles** :
1. URLs n8n incorrectes → Vérifier tous les fichiers listés ci-dessus
2. Workflows n8n non configurés → Créer les workflows
3. Clés API n8n manquantes → Vérifier la configuration n8n
4. Bot sans datasources → Ajouter au moins une datasource indexée

**Comment déboguer** :
1. Ouvrir la console navigateur (F12) → Onglet Network
2. Envoyer un message dans le chat
3. Vérifier la requête vers l'Edge Function
4. Vérifier les logs dans Supabase Dashboard → Edge Functions → chat-proxy → Logs

### "L'ingestion échoue"

**Causes possibles** :
1. URL n8n_ingest_url incorrecte sur le bot
2. Workflow n8n d'ingestion non fonctionnel
3. Fichier trop volumineux (>50MB)
4. Format de fichier non supporté par n8n

**Comment déboguer** :
1. Supabase Dashboard → Edge Functions → ingest-datasource → Logs
2. Vérifier le statut de la datasource dans la table `datasources`
3. Tester le webhook n8n directement avec curl

### "Impossible de se connecter"

**Causes possibles** :
1. Variables d'environnement (.env) manquantes ou incorrectes
2. Migration `setup_default_admin_account` non appliquée
3. Problème de connexion Supabase

**Comment déboguer** :
```sql
-- Vérifier que l'admin existe
SELECT * FROM auth.users WHERE email = 'admin@demo.com';
SELECT * FROM clients WHERE email = 'admin@demo.com';

-- Vérifier le rôle
SELECT id, email, role FROM clients WHERE email = 'admin@demo.com';
```

## 🎯 Résumé : Que faire en priorité ?

### Déploiement minimum viable (chat non fonctionnel mais interface OK)

1. ✅ Créer projet Supabase
2. ✅ Copier fichiers + configurer `.env`
3. ✅ Appliquer migrations SQL
4. ✅ Déployer Edge Functions
5. ✅ Tester connexion admin

**Temps : 30 minutes**
**Résultat : Interface complète mais chat ne fonctionne pas**

### Déploiement complet fonctionnel (100% des features)

1. ✅ Déploiement minimum viable (ci-dessus)
2. ⚠️ Configurer/déployer workflows n8n
3. ⚠️ Search & Replace : `https://n8n.prcz.fr` → `https://VOTRE-N8N.com`
4. ⚠️ Redéployer Edge Functions modifiées
5. ⚠️ Rebuild frontend (`npm run build`)
6. ✅ Tester chat end-to-end

**Temps : 2-3 heures (selon expérience n8n)**
**Résultat : Application 100% fonctionnelle**

## 📞 Support technique

**Ordre de vérification en cas de problème** :

1. Vérifier les logs Supabase (Edge Functions + Database)
2. Vérifier la console navigateur (erreurs JS)
3. Vérifier que n8n répond (curl sur les webhooks)
4. Vérifier les politiques RLS (requêtes SQL)
5. Vérifier les variables d'environnement

**Fichiers de configuration critiques** :
- `.env` (variables Supabase)
- Tous les fichiers avec `n8n.prcz.fr` (à modifier)
- Migrations SQL (ordre d'exécution)
- Edge Functions (redéployer après modification)

## Conclusion

**Réponse à la question initiale** :

**NON**, sans configuration supplémentaire, seulement **~60% des fonctionnalités** fonctionneront automatiquement (auth, interface, gestion bots/datasources).

**Les 40% restants** (chat, ingestion, IA) nécessitent **obligatoirement** :
1. Une instance n8n fonctionnelle avec les workflows configurés
2. La mise à jour de toutes les URLs n8n dans le code
3. Le redéploiement des Edge Functions modifiées

**Temps total pour 100% fonctionnel : 2-3 heures**
