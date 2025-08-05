import pkg from '@slack/bolt';
import dotenv from 'dotenv';
import axios from 'axios';
const quizTypeMap = new Map();
const timeoutMap = new Map();
const userQuizMap = new Map();

dotenv.config({ quiet: true });
const { App } = pkg;

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
});


// Listen to incoming messages that contain "ceau"
app.message('ceau', async ({ message, say }) => {
    await say(`Ceau Sefule <@${message.user}>!`);
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
                        type: 'input',
                        block_id: 'destination_block',
                        element: {
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
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Destination'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'channel_block',
                        optional: true,
                        element: {
                            type: 'conversations_select', // înlocuim static_select cu conversations_select
                            action_id: 'channel_select',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select a channel'
                            },
                            filter: {
                                include: ['public', 'private'],
                                exclude_bot_users: true
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

// After you press submit from the modal.
app.view('brainbuzz_modal', async ({ ack, body, view, client }) => {
    const errors = {};

    const quizType = view.state.values.quiz_type_block.quiz_type.selected_option;
    const destination = view.state.values.destination_block.destination_select.selected_option;

    if (!quizType) {
        errors['quiz_type_block'] = 'You must select a quiz type.';
    }

    if (!destination) {
        errors['destination_block'] = 'You must select a destination.';
    }

    if (Object.keys(errors).length > 0) {
        await ack({ response_action: 'errors', errors });
        return;
    }

    await ack(); // valid

    const typeMap = {
        history: 'historical',
        funny: 'icebreaker',
        movie: 'movie_quote'
    };

    const backendType = typeMap[quizType.value];
    const quizRes = await axios.post('http://localhost:3000/quiz', { type: backendType });
    const quiz = quizRes.data;

    // Salvezi quiz_id asociat cu userul
    userQuizMap.set(body.user.id, quiz.quiz_id);

    const selectedChannel = view.state.values.channel_block.channel_select?.selected_conversation;
    let targetChannel = destination.value === 'private' ? body.user.id : selectedChannel || body.channel?.id;

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
    const config = quizConfigMap.get(userId);
    const typeMap = { history: 'historical', funny: 'icebreaker', movie: 'movie_quote' };
    const backendType = typeMap[config.type];

    try {
        const checkRes = await axios.get(`http://localhost:3000/quiz/check?user_id=${userId}&quiz_type=${backendType}`);
        if (checkRes.data.alreadyCompleted) {
        await client.chat.postMessage({
            channel: userId,
            text: '⚠️ Ai completat deja un quiz de acest tip. Încearcă altul!'
        });
        return;
        }
    } catch (error) {
        console.error('Error checking if quiz already completed:', error);
    }

    // 1. Deschide rapid un modal "loading"
    const loadingModal = await client.views.open({
        trigger_id: body.trigger_id,
        view: {
            type: 'modal',
            callback_id: 'quiz_loading',
            title: { type: 'plain_text', text: 'BrainBuzz Quiz' },
            close: { type: 'plain_text', text: 'Cancel' },
            blocks: [
                {
                    type: 'section',
                    text: { type: 'mrkdwn', text: '⏳ Loading your quiz...' }
                }
            ]
        }
    });


    try {
        // ✅ 1. Ia quiz-ul din backend (care trebuie să conțină quiz_id)
        const response = await axios.get(`http://localhost:3000/quiz/${quizId}`);
        const quiz = response.data;
        console.log('🎯 Quiz primit de la backend:', quiz);

        // ✅ 2. Salvează answer și quiz_id în metadata, ca să le poți folosi la submit
        const result = await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'quiz_submit',
                private_metadata: JSON.stringify({
                    answer: quiz.answer,
                    quiz_id: quiz.quiz_id   // <-- Acum îl trimitem
                }),
                title: { type: 'plain_text', text: 'BrainBuzz Quiz' },
                submit: { type: 'plain_text', text: 'Submit' },
                close: { type: 'plain_text', text: 'Cancel' },
                blocks: [
                    {
                        type: "context",
                        block_id: "timer_block",
                        elements: [
                            {
                                type: "plain_text",
                                text: "⏳ Time remaining: 15 seconds"
                            }
                        ]
                    },
                    {
                        type: "section",
                        text: { type: "mrkdwn", text: `*${quiz.quizText}*` }
                    },
                    {
                        type: "input",
                        block_id: "quiz_answer_block",
                        label: { type: "plain_text", text: "Choose your answer:" },
                        element: {
                            type: "radio_buttons",
                            action_id: "quiz_answer",
                            options: quiz.options.map(option => ({
                                text: { type: "plain_text", text: option },
                                value: option
                            }))
                        }
                    }
                ]
            }
        });

        // ✅ 3. Pornește timer-ul de 15 secunde
        const timeoutId = setTimeout(async () => {
            try {
                await client.chat.postMessage({
                    channel: userId,
                    text: "❌ Failed to complete quiz in the given time.",
                });

                await client.views.update({
                    view_id: result.view.id,
                    hash: result.view.hash,
                    view: {
                        type: "modal",
                        title: { type: "plain_text", text: "Quiz expired" },
                        close: { type: "plain_text", text: "Close" },
                        blocks: [
                            {
                                type: "section",
                                text: {
                                    type: "plain_text",
                                    text: "⏱️ Time's up! You didn't answer in time."
                                }
                            }
                        ]
                    }
                });
            } catch (error) {
                console.error("Timeout update error:", error);
            }
        }, 15000);

        timeoutMap.set(userId, timeoutId);

    } catch (error) {
        console.error('Error fetching or displaying quiz:', error.message);
    }
});

// After the user submits the answer it gets checked
app.view('quiz_submit', async ({ ack, body, view, client }) => {
    await ack();

    // ✅ Oprește timer-ul dacă userul a răspuns
    const timeoutId = timeoutMap.get(body.user.id);
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutMap.delete(body.user.id);
    }

    const selected = view.state.values.quiz_answer_block.quiz_answer.selected_option.value;
    const metadata = JSON.parse(view.private_metadata);
    const correctAnswer = metadata.answer;
    const correct = selected === correctAnswer;

    // ✅ Afișează rezultatul în Slack
    try {
        await client.chat.postMessage({
            channel: body.user.id,
            text: correct
                ? `✅ Correct! The answer is *${correctAnswer}*.`
                : `❌ Wrong! You selected *${selected}*, but the correct answer was *${correctAnswer}*.`
        });
    } catch (error) {
        console.error('Error sending quiz result: ', error);
    }

    // ✅ Trimite rezultatul către backend
    try {
        // Preia informații utile despre user
        const userInfo = await client.users.info({ user: body.user.id });
        const displayName = userInfo.user.profile.display_name;
        const profilePic = userInfo.user.profile.image_512;

        await axios.post('http://localhost:3000/answers', {
            user_id: body.user.id,
            quiz_id: metadata.quiz_id, // <-- UUID valid acum
            correct: correct,
            user_data: {
                display_name: displayName,
                profile_picture_url: profilePic
            }
        });

        console.log('✅ Answer sent to backend successfully.');
    } catch (error) {
        console.error('❌ Failed to send answer to backend:', error.message);
    }
});

// Listening for button clicks
app.action('button_click', async ({ body, ack, say }) => {
    await ack();
    await say(`Hey <@${body.user.id}>! You clicked the button!`);
});

// Bot start.
(async () => {
    await app.start(process.env.PORT || 3000);
    app.logger.info('BrainBuzz is up and running!');
})();
