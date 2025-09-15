
# BrainBuzz Slack Bot

This repository hosts the Slack bot interface for the Brainbuzz bot. Currently it is [hosted publicly using Railway](https://brainbuzz-slack-bot-production.up.railway.app/).

## Run Locally

1. Clone the project

```bash
  git clone https://github.com/raulariton/brainbuzz-slack-bot.git
```

2. Go to the project directory

```bash
  cd brainbuzz-slack-bot
```

3. Install dependencies. Ensure [Node.js](https://nodejs.org/en/download) is installed on your machine, and added to your PATH.

```bash
  npm install
```

4. Set `.env` variables

- Ensure you see **BrainBuzz** in the list of apps on [this page](https://api.slack.com/apps).
- Click the app to go to the app page. You should see a "Basic Information" page with an "App Credentials" section.

- See the `.env.example` file for the tokens you will need to run the Slack bot server.
  - `SLACK_SIGNING_SECRET`: can be obtained from **Basic Information > App Credentials > Signing Secret** on the Slack app page.
  - `SLACK_BOT_TOKEN`: **OAuth & Permissions > Bot User OAuth Token
  - `SUPABASE_URL`, `SUPABASE_KEY`: can be obtained from the Supabase project settings.
  - `AUTO_CHANNEL_ID`: ID of the channel where the bot will run its auto-post quiz on silence routine. Since this feature is still in development, you can enter any string for now (but do not leave it empty).
  - `BACKEND_URL`: URL of the backend server (local or deployed).
  - `BACKEND_KEY`: API key used to access backend server routes.
  - `PORT`: Port number for the server to listen on (recommended 3000).
  - Paste the keys as they are, without any quotation marks     (format example `SLACK_BOT_TOKEN=abcd-1234XYZ`).

5. Start the server locally

```bash
  node src/app.js
```

6. To interact with the bot, you can either add it to a channel (public/private) or send it a message.

---