import supabaseClient from '../../services/supabaseClient.js';
import quizCreationModal from "../../blocks/quizCreationModal.js";

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
                    blocks: await quizCreationModal()
                }
            });
        } catch (error) {
            console.error('Error opening BrainBuzz modal:', error);
        }
    });
}