import ServerClient from '../../services/serverClient.js';
import QuizSessionManager from '../../utils/QuizSessionManager.js';

/**
 * Listener that handles quiz submission from the modal
 */
export default (app) => {
    app.view('quiz_submit', async ({ ack, body, view, client }) => {
        // Acknowledge the submission
        await ack();
        // 2️⃣ Extrage quiz_id din private_metadata și sesiunea asociată
        const quizId = view.private_metadata;
        const session = QuizSessionManager.getQuizSessionMetadata(quizId);

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

        // 4️⃣ Trimite confirmare către user
        try {
            // Preluăm sesiunea și meta-informațiile
            const session = QuizSessionManager.getQuizSessionMetadata(quizId)
            const { creatorUserID, channelID } = session;

            await client.chat.postMessage({
                channel: body.user.id,
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `✅ *I've registered your answer to the quiz created by <@${creatorUserID}>!*\nCheck back in <#${channelID}> to see the results when the quiz ends.`
                        }
                    }
                ]
            });
        } catch (err) {
            console.error('Error sending confirmation message to user:', err);
        }

        // 5️⃣ Trimite răspunsul către backend
        try {
            const userInfo = await client.users.info({ user: body.user.id });
            const displayName =
                userInfo.user.profile.display_name ||
                userInfo.user.profile.real_name ||
                userInfo.user.name;
            const profilePic = userInfo.user.profile.image_512;

            await ServerClient.sendUserAnswer(
                quizId,
                body.user.id,
                {
                    display_name: displayName,
                    profile_picture_url: profilePic
                },
                correct
            );

        } catch (error) {
            console.error('❌ Failed to send answer to backend:', error.message);
        }

        // update session with user answer
        session.usersAnswered.push(body.user.id);
    });
}