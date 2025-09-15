import supabaseClient from '../../services/supabaseClient.js';

/**
 * Listener for the /brainbuzz command to open a quiz configuration modal.
 */
export default (app) => {
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
                                    },
                                    {
                                        text: {
                                            type: 'plain_text',
                                            text: 'Computer Trivia (e.g. programming languages, tech history)'
                                        },
                                        value: 'computer_trivia'
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
}