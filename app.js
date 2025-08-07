import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import pkg from '@slack/bolt';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { handleQuizTimeout } from './handleQuizTimeout.js';

const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const quizSessionMap = new Map();

const { App } = pkg;

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN
});

// Slash command for the quiz
app.command('/brainbuzz', async ({ ack, body, client }) => {
    await ack();
    try {
        // 1. Verifică dacă există un quiz activ
        const { data: activeQuiz, error } = await supabaseClient
            .from('quizzes')
            .select('*')
            .eq('is_active', true)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows found
            console.error('Error checking active quiz:', error);
            return;
        }

        // 2. Dacă există un quiz activ, trimite mesaj și nu deschide modalul
        if (activeQuiz) {
            await client.chat.postEphemeral({
                channel: body.channel_id,
                user: body.user_id,
                text: ":warning: There is already an active quiz!."
            });
            return;
        }
        await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'brainbuzz_modal',
                private_metadata: JSON.stringify({ originChannel: body.channel_id }),
                title: {
                    type: 'plain_text',
                    text: 'BrainBuzz Quiz'
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
                                    text: {
                                        type: 'plain_text',
                                        text: 'Historical/current events based on the current date'
                                    },
                                    value: 'history'
                                },
                                {
                                    text: { type: 'plain_text', text: 'Funny stuff/ ice breakers' },
                                    value: 'funny'
                                },
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: 'Movie/TV Quote Identification'
                                    },
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
                                text: 'Select the duration of the quiz'
                            },
                            options: [
                                { text: { type: 'plain_text', text: '10 seconds' }, value: '10' },
                                { text: { type: 'plain_text', text: '30 seconds' }, value: '30' },
                                { text: { type: 'plain_text', text: '1 minute' }, value: '60' },
                                { text: { type: 'plain_text', text: '5 minutes' }, value: '300' },
                                { text: { type: 'plain_text', text: '10 minutes' }, value: '600' },
                                { text: { type: 'plain_text', text: '30 minutes' }, value: '1800' },
                                { text: { type: 'plain_text', text: '1 hour' }, value: '3600' },
                                { text: { type: 'plain_text', text: '2 hours' }, value: '7200' },
                                { text: { type: 'plain_text', text: '4 hours' }, value: '14400' },
                                { text: { type: 'plain_text', text: '8 hours' }, value: '28800' }
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
    try {
        await ack();
        // 1️⃣ Validări
        const metadata = view.private_metadata ? JSON.parse(view.private_metadata) : {};
        const originChannel = metadata.originChannel;
        const errors = {};
        const quizTypeOpt = view.state.values.quiz_type_block.quiz_type.selected_option;
        const destinationOpt =
            view.state.values.destination_block.destination_select.selected_option;
        const durationOpt = view.state.values.quiz_duration_block.quiz_duration.selected_option;
        
        if (!quizTypeOpt) errors.quiz_type_block = 'You must select a quiz type.';
        if (!destinationOpt) errors.destination_block = 'You must select a destination.';
        if (!durationOpt) errors.quiz_duration_block = 'You must select a duration.';

        if (Object.keys(errors).length > 0) {
            await ack({ response_action: 'errors', errors });
            return;
        }

        // 2️⃣ Extrage valorile alese
        const quizType = quizTypeOpt.value;
        const durationSec = Number(durationOpt.value);
        const destination = destinationOpt.value;
        const selectedChannel =
            view.state.values.channel_block.channel_select?.selected_conversation;
        const targetChannel =
            destination === 'private' ? body.user.id : selectedChannel || originChannel;

        // 3️⃣ Fetch quiz-ul de la backend
        let quiz;
        try {
            const typeMap = { history: 'historical', funny: 'icebreaker', movie: 'movie_quote' };
            const backendType = typeMap[quizType] || quizType;
            const res = await axios.get(
                `http://localhost:3000/quiz?type=${backendType}&duration=${durationSec}`
            );
            quiz = res.data; // { quiz_id, quizText, options, answer, imageUrl }
        } catch (err) {
            console.error('❌ Error fetching quiz:', err.message);
            return;
        }

        // 4️⃣ Calculează endTime și stochează sesiunea
        const now = Date.now();
        const endTime = now + durationSec * 1000;

        // print correct answer
        console.log('Quiz correct answer:', quiz.answer);

        // Meta: cine a creat quiz-ul, ce tip și care e întrebarea
        const quizTypeLabel = quizTypeOpt.text.text;
        const questionText = quiz.quizText;
        const creatorId = body.user.id;
        quizSessionMap.set(
            quiz.quiz_id,
            {
                quiz,
                endTime,
                usersAnswered: [],
                creatorId,
                type: quizTypeLabel,
                question: questionText
            }
        );

        // start timeout
        // NOTE: do not use `await` since it will block the event loop
        handleQuizTimeout(quiz.quiz_id, endTime, app, quizSessionMap);

        // 5️⃣ Trimite mesajul cu butonul “Start Quiz” (doar quiz_id în value)
        const typeNameMap = {
            history: 'Historical',
            funny: 'Funny/Icebreaker',
            movie: 'Popular quote'
        };

        function formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m}:${s.toString().padStart(2, '0')}`;
        }

        try {
            const postResult = await client.chat.postMessage({
                channel: targetChannel,
                text: 'BrainBuzz Quiz!',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `@${body.user.name} has started a new ${typeNameMap[quizType].toLowerCase()} quiz!\nClick the "Start Quiz" button below to give it a try.\n*Time remaining:* ${formatTime(durationSec)}`
                        },
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                text: { type: 'plain_text', text: 'Start Quiz' },
                                action_id: 'start_quiz',
                                value: quiz.quiz_id
                            }
                        ]
                    },
                    {
                        type: 'image',
                        image_url: quiz.imageUrl,
                        alt_text: 'Quiz Image'
                    }
                ]
            });

            const messageTs = postResult.ts;

            quizSessionMap.set(quiz.quiz_id, {
                ...quizSessionMap.get(quiz.quiz_id),
                channel: postResult.channel,
                threadTs: messageTs,
            });

            // 6. Update la fiecare 5 secunde
            let remaining = durationSec;

            const intervalId = setInterval(async () => {
                remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));

                if (remaining <= 0) {
                    clearInterval(intervalId);
                    await client.chat.update({
                        channel: targetChannel,
                        ts: messageTs,
                        text: 'Quiz closed!',
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `@${body.user.name}'s quiz has ended! ⏰`
                                }
                            }
                        ]
                    });
                    return;
                }

                await client.chat.update({
                    channel: targetChannel,
                    ts: messageTs,
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `@${body.user.name} has started a new ${typeNameMap[quizType].toLowerCase()} quiz!\nClick the "Start Quiz" button below to give it a try.\n*Time remaining:* ${formatTime(remaining)}`
                            }
                        },
                        {
                            type: 'actions',
                            elements: [
                                {
                                    type: 'button',
                                    text: { type: 'plain_text', text: 'Start Quiz' },
                                    action_id: 'start_quiz',
                                    value: quiz.quiz_id
                                }
                            ]
                        },
                        {
                            type: 'image',
                            image_url: quiz.imageUrl,
                            alt_text: 'Quiz Image'
                        }
                    ]
                });
            }, 5000);

        } catch (error) {
            console.error('❌ Error posting Start Quiz message:', error);
        }
    } catch (err) {
        console.error(err);
    }
});

app.action('start_quiz', async ({ ack, body, client }) => {
    await ack();

    try {
        // 1️⃣ Extrage quiz_id
        const quizId = body.actions[0].value;
        const session = quizSessionMap.get(quizId);

        if (!session) {
            // sesiună inexistentă sau deja expirată
            return await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    title: { type: 'plain_text', text: 'BrainBuzz Quiz' },
                    close: { type: 'plain_text', text: 'Close' },
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: ":warning: This quiz is no longer active."
                            }
                        }
                    ]
                }
            });
        }

        // if user already answered the quiz, do not open modal
        if (session.usersAnswered?.includes(body.user.id)) {
            return await client.chat.postEphemeral({
                channel: body.channel.id,
                user: body.user.id,
                text: ":warning: You have already answered this quiz! You can't answer twice!"
            });
        }

        const { quiz, endTime } = session;
        const now = Date.now();
        const remainingMs = endTime - now;

        // 2️⃣ Dacă timpul a expirat deja
        if (remainingMs <= 0) {
            return await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    title: { type: 'plain_text', text: 'BrainBuzz Quiz' },
                    close: { type: 'plain_text', text: 'Close' },
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: ':x: _Failed to complete quiz in the given time._'
                            }
                        }
                    ]
                }
            });
        }

        // 3️⃣ Formatează ora de expirare
        const expires = new Date(endTime).toLocaleTimeString('ro-RO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        // 4️⃣ Deschide modalul cu întrebarea și context
        const modal = await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'quiz_submit',
                private_metadata: quizId,
                title: { type: 'plain_text', text: 'BrainBuzz Quiz' },
                submit: { type: 'plain_text', text: 'Submit' },
                close: { type: 'plain_text', text: 'Cancel' },
                blocks: [
                    {
                        type: 'context',
                        elements: [
                            { type: 'mrkdwn', text: `*This quiz is active until ${expires}*` }
                        ]
                    },
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
                            options: quiz.options.map((opt) => ({
                                text: { type: 'plain_text', text: opt },
                                value: opt
                            }))
                        }
                    }
                ]
            }
        });
    } catch (err) {
        console.log(err);
    }
});

app.view('quiz_submit', async ({ ack, body, view, client }) => {
    // Acknowledge the submission
    await ack();

    // 2️⃣ Extrage quiz_id din private_metadata și sesiunea asociată
    const quizId = view.private_metadata;
    const session = quizSessionMap.get(quizId);
    if (!session) {
        // Sesiune inexistentă sau expirat
        await client.chat.postMessage({
            channel: body.user.id,
            text: ':warning: This quiz is no longer active.\n(ERROR: session has expired or does not exist).'
        });
        return;
    }

    // check if user already answered the quiz
    if (session.usersAnswered?.includes(body.user.id)) {
        await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: ":warning: You have already answered this quiz! You can't answer twice!\n(ERROR: user already answered, but modal still opened)."
        });
        return;
    }

    const { quiz } = session;
    const correctAnswer = quiz.answer;

    // 3️⃣ Preia răspunsul utilizatorului
    const selected = view.state.values.quiz_answer_block.quiz_answer.selected_option.value;
    const correct = selected === correctAnswer;

    // 4️⃣ Trimite feedback către user
    try {
        // Preluăm sesiunea și meta-informațiile
        const session = quizSessionMap.get(quizId);
        const { creatorId, type: quizTypeLabel, question } = session;

        // Luăm numele creatorului
        const creatorInfo = await client.users.info({ user: creatorId });
        const creatorName =
            creatorInfo.user.profile.display_name ||
            creatorInfo.user.profile.real_name ||
            creatorInfo.user.name;

        // Construim textul
        let text;
        if (correct) {
            text = [
                '🎉 Well done! That’s the correct answer.',
                `This quiz was created by: *${creatorName}*`,
                `Quiz type: *${quizTypeLabel}*`,
                `Question: _${question}_`
            ].join('\n');
        } else {
            text = [
                '❌ Oops, that was incorrect.',
                `The correct answer was: *${correctAnswer}*`,
                `You selected: *${selected}*`,
                `This quiz was created by: *${creatorName}*`,
                `Quiz type: *${quizTypeLabel}*`,
                `Question: _${question}_`
            ].join('\n');
        }

        await client.chat.postMessage({
            channel: body.user.id,
            text
        });
    } catch (err) {
        console.error('Error sending feedback to user:', err);
    }

    // 5️⃣ Trimite răspunsul către backend
    try {
        const userInfo = await client.users.info({ user: body.user.id });
        const displayName =
            userInfo.user.profile.display_name ||
            userInfo.user.profile.real_name ||
            userInfo.user.name;
        const profilePic = userInfo.user.profile.image_512;

        await axios.post('http://localhost:3000/answers', {
            user_id: body.user.id,
            quiz_id: quizId,
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

    // update session with user answer
    session.usersAnswered.push(body.user.id);
    console.log('Updated session with user answer:', session.usersAnswered);
});

(async () => {
    await app.start(process.env.PORT || 3000);
    app.logger.info('BrainBuzz is up and running!');
})();
