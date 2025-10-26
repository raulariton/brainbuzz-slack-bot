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
    logLevel: LogLevel.ERROR,
    customRoutes: [
        {
            path: '/ping',
            method: ['GET'],
            handler: async (req, res) => {
                res.writeHead(200);
                res.end('pong');
            }
        }
    ]
});

// register listeners
brainbuzz(app);
brainbuzzModal(app);
startQuiz(app);
quizSubmit(app);

(async () => {
    await app.start(process.env.PORT);
    console.log(`BrainBuzz is up and running!\nPort ${process.env.PORT}`);
})();
