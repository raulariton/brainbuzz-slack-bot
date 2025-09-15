import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import pkg, { LogLevel } from '@slack/bolt';
import brainbuzz from './listeners/commands/brainbuzz.js';
import brainbuzzModal from './listeners/views/brainbuzzModal.js';
import startQuiz from './listeners/actions/startQuiz.js';
import quizSubmit from './listeners/views/quizSubmit.js';
const { App } = pkg;

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    logLevel: LogLevel.ERROR
});

// register listeners
brainbuzz(app);
brainbuzzModal(app);
startQuiz(app);
quizSubmit(app);

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('BrainBuzz is up and running!');

    // initSlackAutoQuiz(app, quizSessionMap);
})();
