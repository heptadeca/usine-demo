# Guide de Test - Chatbot RAG

## Fonctionnalités Implémentées

### 1. Gestion du Prompt
**Où:** Dashboard Admin → Manage Bot → Onglet "Prompt"

- Accédez à `/admin/bots/{bot-id}`
- Cliquez sur l'onglet "Prompt" (après Data, Integration, Clients, Events)
- Modifiez le texte du prompt système
- Cliquez sur "Save Prompt" pour enregistrer
- Le prompt est automatiquement envoyé au webhook n8n avec chaque message

**Vérification:** Le prompt est inclus dans le payload JSON envoyé au webhook :
```json
{
  "bot_id": "...",
  "session_id": "...",
  "message": "...",
  "prompt": "Votre prompt personnalisé ici",
  "k": 8,
  "temperature": 0.2,
  "max_tokens": 350
}
```

### 2. Ingestion de Données
**Où:** Dashboard Admin → Manage Bot → Onglet "Data"

- Seul l'upload de fichiers PDF est disponible
- Les options "Add Text" et "Add URL" ont été supprimées
- Cliquez sur "Upload PDF" pour ajouter des documents

### 3. Les 3 Modes d'Affichage

#### Accès aux modes :
1. **Pour les clients authentifiés:**
   - Connectez-vous en tant que client
   - Sélectionnez un bot dans le dashboard
   - Vous serez automatiquement redirigé vers `/chat-modes/{bot-id}`

2. **Pour les admins (test):**
   - Allez dans "Manage Bot" → Onglet "Integration"
   - Trouvez "Chat Modes URL" avec le bouton violet "Open"
   - Cliquez pour ouvrir `/chat-modes/{bot-id}` dans un nouvel onglet

3. **URL directe:**
   - Accédez directement à `/chat-modes/{bot-id}`
   - Remplacez `{bot-id}` par l'ID de votre bot

#### Mode 1 : Chat Bubble (Bulle flottante)
- Cliquez sur "Chat Bubble" dans la page de sélection
- Une bulle bleue apparaît en bas à droite de l'écran
- Cliquez dessus pour ouvrir le chat
- Le chat s'agrandit en fenêtre (400x600px)
- Boutons : Minimiser et Fermer
- La bulle disparaît quand le chat est ouvert

#### Mode 2 : WhatsApp Full Page
- Cliquez sur "Full Page" dans la page de sélection
- Interface plein écran style WhatsApp
- Couleurs authentiques :
  - Header : #075e54 (vert WhatsApp)
  - Fond : #e5ddd5 (beige)
  - Messages utilisateur : #dcf8c6 (vert clair)
  - Messages assistant : blanc
- Bouton retour pour revenir à la sélection des modes

#### Mode 3 : Embedded Widget
- Cliquez sur "Embedded" dans la page de sélection
- Widget de chat intégré au centre de la page
- Dimension : 500px de hauteur
- S'intègre dans une page avec du contenu autour
- Titre et description personnalisables
- Bouton "Back to mode selection" pour revenir

## URLs Importantes

- **Login Admin:** `/login` (email: admin@example.com)
- **Dashboard Admin:** `/admin`
- **Gestion Bot:** `/admin/bots/{bot-id}`
- **Modes de Chat:** `/chat-modes/{bot-id}`
- **Demo Basique:** `/demo/{bot-id}`
- **Client Dashboard:** `/client`

## Test Complet Recommandé

### Étape 1 : Configuration du Bot
1. Connectez-vous en tant qu'admin
2. Créez un nouveau bot ou sélectionnez un existant
3. Allez dans "Manage Bot"
4. Onglet "Data" : Uploadez un PDF
5. Onglet "Prompt" : Configurez le prompt système
6. Onglet "Integration" : Copiez l'URL des modes de chat

### Étape 2 : Test des Modes
1. Ouvrez l'URL `/chat-modes/{bot-id}` dans un nouvel onglet
2. Testez chaque mode :
   - **Bubble:** Vérifiez l'ouverture/fermeture/minimisation
   - **WhatsApp:** Vérifiez le style et l'UX
   - **Embedded:** Vérifiez l'intégration dans la page

### Étape 3 : Vérification du Prompt
1. Dans chaque mode, envoyez un message
2. Vérifiez dans les outils de développement (Network tab)
3. Trouvez la requête vers le webhook n8n
4. Vérifiez que le champ `prompt` contient votre prompt personnalisé

## Dépannage

**Le prompt n'apparaît pas dans les requêtes :**
- Vérifiez que vous avez bien sauvegardé le prompt dans l'onglet "Prompt"
- Rechargez la page du chat
- Vérifiez la console du navigateur pour les erreurs

**Les modes ne s'affichent pas correctement :**
- Assurez-vous d'utiliser un bot existant avec un ID valide
- Vérifiez que le bot est en statut "ready"
- Consultez la console pour les erreurs JavaScript

**Upload PDF ne fonctionne pas :**
- Vérifiez que le fichier est bien un PDF
- Vérifiez les logs de la fonction Edge "ingest-datasource"
- Assurez-vous que le bucket Storage Supabase est configuré
