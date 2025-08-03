
# BrainBuzz Slack Bot

This repository hosts the Slack bot interface for the Brainbuzz bot.

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
  - `SLACK_SIGNING_SECRET`: can be obtained from **Basic Information > App Credentials > Signing Secret**
  - `SLACK_BOT_TOKEN`: **OAuth & Permissions > Bot User OAuth Token
  - `SLACK_APP_TOKEN`: **Basic Information > App-Level Tokens > BrainBuzz Token**. There should be a token already there. If there is not one, you can create one, but **ensure you add the `connections.write`** scope to it.
  - Paste the tokens as they are, without any quotation marks     (format example `SLACK_APP_TOKEN=xapp-123456ABC`).

5. Start the server

```bash
  node app.js
```

6. To interact with the bot, you can either add it to a channel (public/private) or send it a message.

---