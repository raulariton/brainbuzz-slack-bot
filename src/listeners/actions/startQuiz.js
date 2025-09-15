import QuizSessionManager from '../../utils/QuizSessionManager.js';

/**
 * Listener for the "Start Quiz" button action.
 */
export default (app) => {
    app.action('start_quiz', async ({ ack, body, client }) => {
        await ack();

        try {
            // 1️⃣ Extrage quiz_id
            const quizId = body.actions[0].value;
            const session = QuizSessionManager.getQuizSessionMetadata(quizId)

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
            await client.views.open({
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
}