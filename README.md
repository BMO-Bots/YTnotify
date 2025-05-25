# QUESTO README E' AUTOGENERATO PERCHE' SENTENDOMI GENEROSO VOLEVO DARE LA POSSIBILITA' ALL'UTENTE MEDIO DI RUBARE IL CODICE E USARLO

 Guida alla Configurazione

## Come ottenere i valori necessari per il file .env

### 1. DISCORD_TOKEN (Token del Bot Discord)

1. Vai su https://discord.com/developers/applications
2. Clicca su "New Application" e dai un nome al tuo bot
3. Vai nella sezione "Bot" nel menu laterale
4. Clicca su "Reset Token" e copia il token
5. **IMPORTANTE**: Non condividere mai questo token!

### 2. DISCORD_CHANNEL_ID (ID del Canale Discord)

1. Abilita la "Modalità sviluppatore" in Discord:
   - Impostazioni → Avanzate → Modalità sviluppatore (ON)
2. Clicca destro sul canale dove vuoi le notifiche
3. Seleziona "Copia ID canale"

### 3. YOUTUBE_API_KEY (Chiave API YouTube)

1. Vai su https://console.cloud.google.com
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita "YouTube Data API v3":
   - API e servizi → Libreria → cerca "YouTube Data API v3" → Abilita
4. Crea credenziali:
   - API e servizi → Credenziali → Crea credenziali → Chiave API
5. Copia la chiave API

### 4. YOUTUBE_CHANNEL_1 e YOUTUBE_CHANNEL_2 (ID Canali YouTube)

**Metodo 1 - Da URL del canale:**
- Se l'URL è `https://www.youtube.com/channel/UC123456789`, l'ID è `UC123456789`

**Metodo 2 - Da nome utente:**
- Vai su `https://www.googleapis.com/youtube/v3/channels?key=TUA_API_KEY&forUsername=NOME_UTENTE&part=id`
- Sostituisci `TUA_API_KEY` e `NOME_UTENTE`

**Metodo 3 - Da URL personalizzato:**
- Usa l'handle: `https://www.googleapis.com/youtube/v3/channels?key=TUA_API_KEY&forHandle=@HANDLE&part=id`

### 5. ROLE_LONG_VIDEO e ROLE_SHORT_VIDEO (ID Ruoli Discord)

1. Nel server Discord, clicca destro sul ruolo
2. Seleziona "Copia ID ruolo"
3. Se non vedi questa opzione, assicurati di aver abilitato la modalità sviluppatore

## Inviti del Bot

Per invitare il bot nel tuo server Discord:

1. Vai nell'applicazione Discord Developer Portal
2. Sezione "OAuth2" → "URL Generator"
3. Seleziona questi scopes:
   - `bot`
   - `applications.commands`
4. Seleziona questi permessi bot:
   - `Send Messages`
   - `Use External Emojis`
   - `Embed Links`
   - `Mention Everyone`
5. Copia l'URL generato e aprilo nel browser

## Test

Una volta configurato tutto:

1. Avvia il bot: `npm start`
2. Nel canale Discord configurato, scrivi: `!test123`
3. Il bot dovrebbe inviare l'ultimo video di entrambi i canali
