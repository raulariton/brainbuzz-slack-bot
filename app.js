import pkg from '@slack/bolt';
import dotenv from 'dotenv';

dotenv.config({quiet: true});
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
            }
        ],
        text: "Click the button below to interact with me!"
    });
});

// slash command for the quizz
app.command('/brainbuzz', async ({ ack, body, client }) => {
    await ack(); // acknowledge the command
 try {
        await client.views.open({  
            trigger_id: body.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'brainbuzz_modal',
                title: {
                    type: 'plain_text',
                    text: 'BrainBuzz Quiz',
                },
                submit: {
                    type: 'plain_text',
                    text: 'Submit'
                },
                close: {
                    type: 'plain_text',
                    text: 'Cancel'
                },
                blocks: [
                    {
                        type: 'input',
                        block_id: 'quiz_type_block',
                        element: {
                            type: 'static_select',
                            action_id: 'quiz_type',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select a quiz type'
                            },
                            options: [
                                {
                                    text: { type: 'plain_text', text: 'Historical/current events based on the current date' },
                                    value: 'history'
                                },
                                {
                                    text: { type: 'plain_text', text: 'Funny stuff/ ice breakers' },
                                    value: 'funny'
                                },
                                {
                                    text: { type: 'plain_text', text: 'Movie/TV Quote Identification' },
                                    value: 'movie'
                                }
                            ]
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Quiz Type'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'channel_block',
                        element: {
                            type: 'conversations_select',
                            action_id: 'channel_select',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select a channel'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Channel'
                        }
                    }
                ]
            }
        });
    } catch (error) {
        console.error(error);
    }
});

// handle submit from the modal (fereastra)
app.view('brainbuzz_modal', async ({ ack, body, view, client }) => {
    await ack(); // acknowledge the submit 

    const quizType = view.state.values.quiz_type_block.quiz_type.selected_option.value;
    const channel = view.state.values.channel_block.channel_select.selected_conversation;

    try {
        // for testing 
        /*await client.chat.postMessage({
        channel: body.user.id,  
        text: "BrainBuzz quiz selected: *" + quizType + "*"
        });*/

         //for normal messages in channels
         /*await client.chat.postMessage({
         channel: channel,
         text: "BrainBuzz quiz selected: *" + quizType + "*"
         });*/

    } catch (error) {
        console.error('Error posting message: ', error);
    }
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