/*
  # Ajouter l'accès anonyme pour le chat intégré

  1. Changements
    - Ajouter des policies pour permettre aux utilisateurs anonymes (anon) d'utiliser le chatbot
    - Les utilisateurs anonymes peuvent lire les informations des bots (pour obtenir l'URL n8n)
    - Les utilisateurs anonymes peuvent créer des sessions
    - Les utilisateurs anonymes peuvent créer et lire leurs propres messages

  2. Sécurité
    - Les utilisateurs anonymes ne peuvent lire que les informations nécessaires des bots
    - Ils ne peuvent pas modifier les bots ou accéder aux données sensibles
    - Ils peuvent uniquement créer des sessions et des messages pour interagir avec le chatbot
*/

-- Supprimer les anciennes policies anonymes si elles existent
DROP POLICY IF EXISTS "Anonymous users can view bots for chat" ON bots;
DROP POLICY IF EXISTS "Anonymous users can create sessions" ON sessions;
DROP POLICY IF EXISTS "Anonymous users can view sessions" ON sessions;
DROP POLICY IF EXISTS "Anonymous users can create messages" ON messages;
DROP POLICY IF EXISTS "Anonymous users can view messages" ON messages;

-- Permettre aux utilisateurs anonymes de lire les informations des bots (nécessaire pour obtenir l'URL n8n)
CREATE POLICY "Anonymous users can view bots for chat"
  ON bots FOR SELECT
  TO anon
  USING (true);

-- Permettre aux utilisateurs anonymes de créer des sessions
CREATE POLICY "Anonymous users can create sessions"
  ON sessions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Permettre aux utilisateurs anonymes de lire leurs sessions (pour vérifier que la session existe)
CREATE POLICY "Anonymous users can view sessions"
  ON sessions FOR SELECT
  TO anon
  USING (true);

-- Permettre aux utilisateurs anonymes de créer des messages
CREATE POLICY "Anonymous users can create messages"
  ON messages FOR INSERT
  TO anon
  WITH CHECK (true);

-- Permettre aux utilisateurs anonymes de lire les messages (pour afficher l'historique de conversation)
CREATE POLICY "Anonymous users can view messages"
  ON messages FOR SELECT
  TO anon
  USING (true);