import pkg from '@slack/bolt';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const { App } = pkg;

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
});


// Hardcoded Quizz
const hardcodedQuiz = {
    quizText: "What event occurred on July 28, 2025?",
    options: [
        "Tonga Volcano Eruption, 2018",
        "Apple Unveils iPhone, 2007",
        "NASA's Curiosity Rover Lands on Mars, 2012",
        "Solar Eclipse Observed Across Parts of the World, 2025"
    ],
    answer: "Solar Eclipse Observed Across Parts of the World, 2025"
};

// Listen to incoming messages that contain "ceau"
app.message('ceau', async ({ message, say }) => {
    await say(`Ceau <@${message.user}>!`);
});

// Listen to incoming messages that contain "hello"
app.message('hello', async ({ message, say }) => {
    app.logger.info(`Received a message from user ${message.user}: ${message.text}`);
    await say(`Hello <@${message.user}>!`);
});

// Listen to incoming messages that contain "special"
app.message('special', async ({ message, say }) => {
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

// Slash command for the quiz
app.command('/brainbuzz', async ({ ack, body, client }) => {
    await ack();
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
                        type: 'section',
                        block_id: 'destination_block',
                        text: {
                            type: 'mrkdwn',
                            text: 'Where should the quiz be sent?'
                        },
                        accessory: {
                            type: 'static_select',
                            action_id: 'destination_select',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select destination'
                            },
                            options: [
                                {
                                    text: { type: 'plain_text', text: 'Send to me (private DM)' },
                                    value: 'private'
                                },
                                {
                                    text: { type: 'plain_text', text: 'Send to a channel' },
                                    value: 'channel'
                                }
                            ]
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'channel_block',
                        optional: true,
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
                            text: 'Channel (if selected above)'
                        }
                    }
                ]
            }
        });
    } catch (error) {
        console.error(error);
    }
});

// After you press submit from the modal
app.view('brainbuzz_modal', async ({ ack, body, view, client }) => {
    await ack();

    const destination = view.state.values.destination_block.destination_select.selected_option.value;
    const selectedChannel = view.state.values.channel_block.channel_select?.selected_conversation;

    let targetChannel = destination === 'private' ? body.user.id : selectedChannel || body.channel.id;

    // Start Quiz button (UI)
    try {
        await client.chat.postMessage({
            channel: targetChannel,
            text: `BrainBuzz Quiz!`,
            blocks: [
                {
                    type: "section",
                    text: { type: "mrkdwn", text: "*Ready for the quiz?*" }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: { type: "plain_text", text: "Start Quiz" },
                            action_id: "start_quiz"
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error('Error posting message: ', error);
    }
});

// When the button start_quiz is pressed
app.action('start_quiz', async ({ ack, body, client }) => {
    await ack();

    const userId = body.user.id;
    try {
        await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'quiz_submit',
                title: { type: 'plain_text', text: 'BrainBuzz Quiz' },
                submit: { type: 'plain_text', text: 'Submit' },
                close: { type: 'plain_text', text: 'Cancel' },
                blocks: [
                    {
                        type: "section",
                        text: { type: "mrkdwn", text: `*${hardcodedQuiz.quizText}*` }
                    },
                    {
                        type: "input",
                        block_id: "quiz_answer_block",
                        label: { type: "plain_text", text: "Choose your answer:" },
                        element: {
                            type: "radio_buttons",
                            action_id: "quiz_answer",
                            options: hardcodedQuiz.options.map(opt => ({
                                text: { type: "plain_text", text: opt },
                                value: opt
                            }))
                        }
                    }
                ]
            }
        });
    } catch (error) {
        console.error('Error opening quiz modal: ', error);
    }
});

// After the user submits the answer it gets checked
app.view('quiz_submit', async ({ ack, body, view, client }) => {
    await ack();

    const selected = view.state.values.quiz_answer_block.quiz_answer.selected_option.value;
    const correct = selected === hardcodedQuiz.answer;

    try {
        await client.chat.postMessage({
            channel: body.user.id,
            text: correct
                ? `Correct! The answer is *${hardcodedQuiz.answer}*.`
                : `Wrong! You selected *${selected}*, but the correct answer is *${hardcodedQuiz.answer}*.`
        });
    } catch (error) {
        console.error('Error sending result: ', error);
    }
});

// Listening for button clicks
app.action('button_click', async ({ body, ack, say }) => {
    await ack();
    await say(`Hey <@${body.user.id}>! You clicked the button!`);
});

// Bot start
(async () => {
    await app.start(process.env.PORT || 3000);
    app.logger.info('BrainBuzz is up and running!');
})();
