import pkg from '@slack/bolt';
import dotenv from 'dotenv';

dotenv.config();
const {App} = pkg;

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
});

// listen to incoming messages that contain "ceau"
app.message('ceau', async ({message, say}) => {
    // say method sends a message to the channel where the event was triggered
    await say(`Ceau <@${message.user}>!`);
});

// listen to incoming messages that contain "hello"
app.message('hello', async ({message, say}) => {
    app.logger.info(`Received a message from user ${message.user}: ${message.text}`);
    await say(`Hello <@${message.user}>!`);
});

// listen to incoming messages that contain "special"
app.message('special', async ({message, say}) => {
    await say({
        blocks: [
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Click me!",
                            "emoji": true
                        },
                        "value": "click_me_123",
                        "action_id": "button_click"
                    }
                ],
                text: "Click the button below to interact with me!"
            }
        ],
    });
});

// listen to button clicks
app.action('button_click', async ({body, ack, say}) => {
    // acknowledge the action request
    await ack();

    // respond to the button click
    await say(`Hey <@${body.user.id}>! You clicked the button!`);
});

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000);

    app.logger.info('BrainBuzz is up and running!');
})();