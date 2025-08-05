import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import pkg from '@slack/bolt';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const quizConfigMap = new Map();
const timeoutMap = new Map();

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
        // 1. Verifică dacă există un quiz activ
        const { data: activeQuiz, error } = await supabase
            .from('quizzes')
            .select('*')
            .eq('is_active', true)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error checking active quiz:', error);
            return;
        }

        // 2. Dacă există un quiz activ, trimite mesaj și nu deschide modalul
        if (activeQuiz) {
            await client.chat.postEphemeral({
                channel: body.channel_id,
                user: body.user_id,
                text: '⚠️ Există deja un quiz activ! Așteaptă să expire înainte de a crea unul nou.'
            });
            return;
        }
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
                            type: 'conversations_select',
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
                    },
                    {
                        type: 'input',
                        block_id: 'quiz_duration_block',
                        element: {
                            type: 'static_select',
                            action_id: 'quiz_duration',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Selectează durata quiz-ului'
                            },
                            options: [
                                { text: { type: 'plain_text', text: '10 secunde' }, value: '10' },
                                { text: { type: 'plain_text', text: '30 secunde' }, value: '30' },
                                { text: { type: 'plain_text', text: '1 minut' }, value: '60' },
                                { text: { type: 'plain_text', text: '5 minute' }, value: '300' },
                                { text: { type: 'plain_text', text: '10 minute' }, value: '600' },
                                { text: { type: 'plain_text', text: '30 minute' }, value: '1800' },
                                { text: { type: 'plain_text', text: '1 ora' }, value: '3600' },
                                { text: { type: 'plain_text', text: '2 ore' }, value: '7200' },
                                { text: { type: 'plain_text', text: '4 ore' }, value: '14400' },
                                { text: { type: 'plain_text', text: '8 ore' }, value: '28800' }
                            ]
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Quiz Duration'
                        }
                    }
                ]
            }
        });
    } catch (error) {
        console.error('Error opening BrainBuzz modal:', error);
    }
});




app.view('brainbuzz_modal', async ({ ack, body, view, client }) => {
    const errors = {};


    const quizTypeOpt = view.state.values.quiz_type_block.quiz_type.selected_option;
    const destinationOpt = view.state.values.destination_block.destination_select.selected_option;
    const durationOpt = view.state.values.quiz_duration_block.quiz_duration.selected_option;


    if (!quizTypeOpt) errors.quiz_type_block = 'You must select a quiz type.';
    if (!destinationOpt) errors.destination_block = 'You must select a destination.';
    if (!durationOpt) errors.quiz_duration_block = 'You must select a duration.';

    if (Object.keys(errors).length > 0) {
        await ack({ response_action: 'errors', errors });
        return;
    }

    await ack(); // input-urile sunt valide


    quizConfigMap.set(body.user.id, {
        type: quizTypeOpt.value,
        duration: Number(durationOpt.value)
    });
    try {
        const typeMap = {
            history: 'historical',
            funny: 'icebreaker',
            movie: 'movie_quote'
        };
        const backendType = typeMap[quizTypeOpt.value] || quizTypeOpt.value;
        await axios.get(
            `http://localhost:3000/quiz?type=${backendType}&duration=${durationOpt.value}`
        );
        console.log('✅ Quiz pre-generated successfully');
    } catch (err) {
        console.error('❌ Error pre-generating quiz:', err.message);
    }


    const selectedChannel = view.state.values.channel_block.channel_select?.selected_conversation;
    const targetChannel = destinationOpt.value === 'private'
        ? body.user.id
        : (selectedChannel || body.channel?.id);


    try {
        await client.chat.postMessage({
            channel: targetChannel,
            text: 'BrainBuzz Quiz!',
            blocks: [
                {
                    type: 'section',
                    text: { type: 'mrkdwn', text: '*Ready for the quiz?*' }
                },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: { type: 'plain_text', text: 'Start Quiz' },
                            action_id: 'start_quiz',
                            value: JSON.stringify({
                                type: quizTypeOpt.value,
                                duration: Number(durationOpt.value)
                            })
                        }
                    ]
                }
            ]
        });

    } catch (error) {
        console.error('Error posting Start Quiz message:', error);
    }
});


app.action('start_quiz', async ({ ack, body, client }) => {
    await ack();

    // 1. Deschide rapid modalul "loading"
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

    // 2. Extrage type și duration din buton
    const { type, duration } = JSON.parse(body.actions[0].value);
    const typeMap = {
        history: 'historical',
        funny: 'icebreaker',
        movie: 'movie_quote'
    };
    const backendType = typeMap[type] || type;

    // 3. Fetch quiz de la backend
    try {
        const response = await axios.get(
            `http://localhost:3000/quiz?type=${backendType}&duration=${duration}`

        );
        const quiz = response.data;

        // 4. Update modal cu quiz-ul real
        await client.views.update({
            view_id: loadingModal.view.id,
            hash: loadingModal.view.hash,
            view: {
                type: 'modal',
                callback_id: 'quiz_submit',
                private_metadata: JSON.stringify({
                    quiz_id: quiz.quiz_id,
                    answer: quiz.answer
                }),
                title: { type: 'plain_text', text: 'BrainBuzz Quiz' },
                submit: { type: 'plain_text', text: 'Submit' },
                close: { type: 'plain_text', text: 'Cancel' },
                blocks: [
                    {
                        type: 'section',
                        text: { type: 'mrkdwn', text: `*${quiz.quizText}*` }
                    },
                    {
                        type: 'input',
                        block_id: 'quiz_answer_block',
                        label: { type: 'plain_text', text: 'Choose your answer:' },
                        element: {
                            type: 'radio_buttons',
                            action_id: 'quiz_answer',
                            options: quiz.options.map(opt => ({
                                text: { type: 'plain_text', text: opt },
                                value: opt
                            }))
                        }
                    }
                ]
            }
        });
    } catch (error) {
        console.error('Error fetching or displaying quiz:', error);
    }
});




app.view('quiz_submit', async ({ ack, body, view, client }) => {
    await ack();

    // 1️⃣ Oprire timer dacă există
    const timeoutId = timeoutMap.get(body.user.id);
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutMap.delete(body.user.id);
    }

    // 2️⃣ Preluare răspuns selectat și metadate
    const selected = view.state.values.quiz_answer_block.quiz_answer.selected_option.value;
    const metadata = JSON.parse(view.private_metadata);
    const correctAnswer = metadata.answer;
    const correct = selected === correctAnswer;

    // 3️⃣ Trimite feedback către user în Slack
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

    // 4️⃣ Preia informații despre utilizator cu fallback pentru display_name
    try {
        const userInfo = await client.users.info({ user: body.user.id });

        const displayName =
            userInfo.user.profile.display_name ||      // preferat
            userInfo.user.profile.real_name ||         // fallback
            userInfo.user.name;                        // ultim fallback (username Slack)

        const profilePic = userInfo.user.profile.image_512;

        console.log('📌 Display name folosit:', displayName);

        // 5️⃣ Trimite răspunsul către backend
        await axios.post('http://localhost:3000/answers', {
            user_id: body.user.id,
            quiz_id: metadata.quiz_id,
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


app.action('button_click', async ({ body, ack, say }) => {
    await ack();
    await say(`Hey <@${body.user.id}>! You clicked the button!`);
});


(async () => {
    await app.start(process.env.PORT || 3000);
    app.logger.info('BrainBuzz is up and running!');
})();
