# Migration Checklist for New Deployments

This document ensures all functionality works when deploying to a new Bolt instance or Supabase project.

## Pre-Deployment Verification

### 1. Database Migrations
All migrations are self-contained and can be applied in order:

```bash
supabase/migrations/
├── 20251106170440_20251010090617_create_rag_chatbot_schema.sql
├── 20251106170541_20251010093800_setup_auth_users.sql
├── 20251106170615_20251010095158_add_bot_client_access.sql
├── 20251106170623_20251013081123_create_storage_bucket_for_datasources.sql
├── 20251106170629_20251013083438_add_api_key_to_bots.sql
├── 20251106170637_20251013085652_update_rls_for_client_bot_access.sql
├── 20251106170714_20251013090555_create_auth_users.sql
├── 20251106170721_20251013090809_reset_user_passwords.sql
├── 20251106170729_20251013091018_make_pw_hash_nullable.sql
├── 20251106170737_20251013091557_clean_users_and_create_admin.sql
├── 20251106170804_20251013091739_reset_user_passwords.sql
├── 20251106170812_20251024131519_add_prompt_to_bots.sql
├── 20251106170821_20251030132935_add_anonymous_chat_access.sql
├── 20251106170909_20251030135652_fix_security_performance_issues.sql
├── 20251106170938_20251030135915_fix_infinite_recursion_in_policies.sql
├── 20251106170956_20251106160000_setup_default_admin_account.sql ⚠️ CRITICAL
├── 20251106172118_20251106172051_add_cascade_delete_for_clients.sql
```

**⚠️ CRITICAL**: The migration `20251106170956_20251106160000_setup_default_admin_account.sql` contains the trigger that makes client creation work. Without it, new clients won't appear in the database!

### 2. Edge Functions
All Edge Functions are self-contained with no shared dependencies:

- ✅ `chat-proxy` - Proxies chat requests to external AI API
- ✅ `create-admin` - Creates admin users
- ✅ `create-client` - Creates client users (has fallback if trigger fails)
- ✅ `delete-client` - Deletes clients and all related data
- ✅ `delete-datasource` - Deletes datasource files
- ✅ `download-datasource` - Downloads datasource files
- ✅ `ingest-datasource` - Ingests datasource files

**No shared code between functions** - each is independently deployable.

## Deployment Steps

### Step 1: Set Up New Supabase Project
1. Create a new Supabase project
2. Note your:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Step 2: Configure Environment Variables
Update your `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 3: Apply Database Migrations
Apply all migrations in order:
```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Copy and run each migration file in chronological order
```

### Step 4: Verify Critical Database Setup

Run this SQL to verify the trigger exists:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Expected result:** Should return 1 row showing the trigger on `auth.users`

If missing, run:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### Step 5: Deploy Edge Functions
Deploy each Edge Function:
```bash
# Using Supabase CLI
supabase functions deploy chat-proxy
supabase functions deploy create-admin
supabase functions deploy create-client
supabase functions deploy delete-client
supabase functions deploy delete-datasource
supabase functions deploy download-datasource
supabase functions deploy ingest-datasource
```

Or use the MCP tools in Bolt to deploy them.

### Step 6: Verify Default Admin Account
Check that the default admin was created:
```sql
SELECT email, role FROM clients WHERE role = 'admin';
```

**Expected result:** Should see `admin@demo.com` with role `admin`

**Default credentials:**
- Email: `admin@demo.com`
- Password: `Adm1n$ecur3!2025`

### Step 7: Test Core Functionality

1. **Login Test:**
   - Navigate to `/login`
   - Login with admin credentials
   - Should redirect to admin dashboard

2. **Client Creation Test:**
   - Go to Admin Dashboard
   - Create a new client with email `test@example.com`
   - **Verify the client appears in the list immediately**
   - Check database: `SELECT * FROM clients WHERE email = 'test@example.com';`
   - Should return 1 row

3. **Bot Creation Test:**
   - Create a bot
   - Verify it appears in the bots list
   - Check it's assigned to the correct owner

4. **Client Deletion Test:**
   - Delete the test client
   - Verify all related data is deleted (bots, sessions, access)

## Common Issues & Solutions

### Issue: Client created but doesn't appear in database
**Cause:** The `on_auth_user_created` trigger is missing

**Solution:**
1. Check if trigger exists (see Step 4)
2. If missing, create it manually
3. The `create-client` Edge Function has a fallback, but trigger is preferred

### Issue: Edge Functions return 500 errors
**Cause:** Missing environment variables in Supabase

**Solution:**
Environment variables are auto-configured in Supabase. If issues persist:
1. Check Supabase Dashboard > Edge Functions > Settings
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present
3. Redeploy the function

### Issue: RLS policies blocking access
**Cause:** User doesn't have proper role in clients table

**Solution:**
```sql
-- Check user's role
SELECT id, email, role FROM clients WHERE email = 'user@example.com';

-- Update role if needed
UPDATE clients SET role = 'admin' WHERE email = 'user@example.com';
```

## Post-Deployment Verification Checklist

- [ ] All 17 migrations applied successfully
- [ ] `on_auth_user_created` trigger exists
- [ ] Default admin account exists and can login
- [ ] Can create new clients and they appear immediately
- [ ] Can create bots and assign to clients
- [ ] Can delete clients and cascade works
- [ ] All 7 Edge Functions deployed
- [ ] Storage bucket `datasources` exists
- [ ] RLS policies are active on all tables

## Migration File Integrity

**Do not delete or modify these critical migrations:**
- `20251106170956_20251106160000_setup_default_admin_account.sql` - Contains the trigger
- `20251106172118_20251106172051_add_cascade_delete_for_clients.sql` - Enables cascade deletes

**Warning:** If you copied this project before November 6, 2025 18:00, you may be missing critical trigger setup. Update your migrations from the latest version.

## Rollback Procedure

If deployment fails:
1. Drop all tables: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
2. Re-apply migrations in order
3. Verify trigger creation
4. Redeploy Edge Functions

## Support

If issues persist after following this checklist:
1. Check Supabase logs in Dashboard
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Ensure you're using the latest migration files
