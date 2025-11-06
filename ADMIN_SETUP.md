# Configuration de l'authentification Admin

## Vue d'ensemble

Le système d'authentification utilise Supabase Auth avec une gestion sécurisée des rôles administrateurs.

## Architecture

1. **Supabase Auth** : Gestion des utilisateurs et de l'authentification
2. **Table `clients`** : Stockage des rôles (admin/client) - source unique de vérité
3. **Trigger automatique** : Synchronisation automatique entre `auth.users` et `clients`
4. **Auto-setup** : Compte admin par défaut créé automatiquement lors du déploiement

## Compte admin par défaut

Lors du déploiement de l'application sur un nouveau projet Supabase, un compte admin est **automatiquement créé** :

- **Email** : `admin@demo.com`
- **Mot de passe** : `Adm1n$ecur3!2025`

Vous pouvez vous connecter immédiatement avec ces identifiants.

**Important** : Pour des raisons de sécurité, changez ce mot de passe après la première connexion en production.

## Créer des comptes admin supplémentaires

### Méthode 1 : Via l'Edge Function

```bash
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/create-admin \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nouvel-admin@example.com",
    "password": "MotDePasseSecurise123",
    "admin_key": "CHANGE_THIS_IN_PRODUCTION"
  }'
```

### Méthode 2 : Via le Dashboard Supabase

1. Allez dans Authentication → Users
2. Cliquez sur "Add user"
3. Entrez l'email et le mot de passe
4. Après création, allez dans l'onglet SQL Editor
5. Exécutez cette requête :

```sql
-- Mettre à jour le rôle dans les métadonnées
UPDATE auth.users
SET raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"admin"}'
WHERE email = 'nouvel-admin@example.com';

-- Mettre à jour le rôle dans la table clients
UPDATE clients
SET role = 'admin'
WHERE email = 'nouvel-admin@example.com';
```

## Connexion

Une fois le compte créé, connectez-vous via l'interface web :

1. Allez sur la page de connexion
2. Entrez l'email et le mot de passe
3. Le système détecte automatiquement le rôle admin

## Vérification

Pour vérifier qu'un utilisateur est admin :

```sql
-- Vérifier dans la table clients
SELECT id, email, role FROM clients WHERE role = 'admin';

-- Vérifier les métadonnées dans auth.users
SELECT id, email, raw_app_meta_data->>'role' as role
FROM auth.users
WHERE raw_app_meta_data->>'role' = 'admin';
```

## Sécurité

### Bonnes pratiques

1. **Changez les identifiants par défaut** : Le compte `admin@demo.com` doit avoir son mot de passe modifié en production
2. **Utilisez des mots de passe forts** : Minimum 12 caractères avec majuscules, minuscules, chiffres et symboles
3. **Limitez les accès admin** : Ne créez des comptes admin que pour les personnes de confiance
4. **Surveillez les connexions** : Vérifiez régulièrement les logs d'authentification

### Clé admin master (MASTER_ADMIN_KEY)

Pour utiliser l'Edge Function de création d'admin, vous devez configurer une clé sécurisée :

1. Dashboard Supabase → Settings → Edge Functions → Environment variables
2. Ajoutez : `MASTER_ADMIN_KEY` = `votre-cle-secrete-unique`
3. Redéployez la fonction si nécessaire

**Important** : Ne partagez jamais cette clé. Elle permet de créer des comptes admins.

## Dépannage

### L'utilisateur ne peut pas accéder aux fonctions admin

Vérifiez que le rôle est bien défini :

```sql
-- Vérifier le rôle dans clients
SELECT id, email, role FROM clients WHERE email = 'votre-admin@example.com';

-- Si le rôle n'est pas correct, corrigez-le
UPDATE clients SET role = 'admin' WHERE email = 'votre-admin@example.com';

-- Assurez-vous aussi que les métadonnées sont correctes
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'votre-admin@example.com';
```

### Erreur "Invalid admin key" lors de l'utilisation de l'Edge Function

La clé fournie ne correspond pas à `MASTER_ADMIN_KEY`. Vérifiez la variable d'environnement dans le Dashboard Supabase.

### Erreur "User with this email already exists"

Un compte existe déjà avec cet email. Utilisez un autre email ou mettez à jour le compte existant pour lui donner les droits admin.

## Architecture technique

### Synchronisation automatique

Un trigger PostgreSQL synchronise automatiquement `auth.users` avec `clients` :

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

Le trigger garantit que :
- Chaque utilisateur dans `auth.users` a un enregistrement dans `clients`
- Le rôle dans `raw_app_meta_data` est synchronisé avec `clients.role`
- La table `clients` reste la source unique de vérité pour les rôles

### Fonction RLS is_admin()

Toutes les politiques RLS utilisent cette fonction pour vérifier les droits admin :

```sql
CREATE FUNCTION is_admin()
RETURNS boolean
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clients
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

Cela centralise la logique de vérification et garantit la cohérence.

### Auto-création du compte admin

La migration `setup_default_admin_account` crée automatiquement le compte admin lors du déploiement :

```sql
CREATE OR REPLACE FUNCTION setup_default_admin()
RETURNS void
AS $$
BEGIN
  -- Vérifie si admin existe déjà
  -- Si non, crée admin@demo.com avec mot de passe sécurisé
  -- Garantit idempotence : safe de ré-exécuter
END;
$$;
```

Cette approche garantit qu'un administrateur peut toujours accéder à l'application, même sur un nouveau déploiement.
