import { sendRewardsToTopUsers } from './sendRewardsToTopUsers.js';
import ordinal from 'ordinal';
import ServerClient from '../services/serverClient.js';
import QuizSessionManager from './QuizSessionManager.js';

export async function handleQuizTimeout(quizId, quizEndTime, app) {
    const now = new Date();
    const remainingMs = quizEndTime - now;

    if (remainingMs <= 0) {
        // TODO: is this check necessary?
        console.log(`Quiz with ID ${quizId} has already expired.`);
        return;
    }

    console.log(`Setting timeout for quiz with ID ${quizId} for ${remainingMs} ms.`);

    let topUsersWithImages = [];
    let otherUsers = [];

    setTimeout(async () => {
        console.log(`Quiz with ID ${quizId} has timed out.`);

        // fetch results from the guiz engine
        try {
            const data = await ServerClient.getResults(quizId)

            topUsersWithImages = data.topUsersWithImages;
            otherUsers = data.otherUsers;
        } catch (error) {
            console.error(`Failed to fetch results for quiz ID ${quizId}:`, error.message);
            return;
        }

        // fetch results from quiz engine and send rewards to top 3 users
        await sendRewardsToTopUsers(quizId, topUsersWithImages, otherUsers, app);

        const session = QuizSessionManager.getQuizSessionMetadata(quizId);
        if (!session) {
            console.warn(`No session found for quiz ${quizId}, skipping summary post.`);
            return;
        }

        const totalParticipants = session?.usersAnswered?.length || 0;

        const summaryBlocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*🏁 The quiz is over!*\n❔ ${session.quiz.quizText}\n✅ Correct answer: *${session.quiz.answer}*`
                }
            }
        ];

        if (!topUsersWithImages || topUsersWithImages.length === 0) {
            if (totalParticipants === 0) {
                summaryBlocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: 'No one participated in the quiz.'
                    }
                });
            } else {
                summaryBlocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `Nobody answered correctly, but ${totalParticipants} ${totalParticipants > 1 ? 'participants' : 'participant'} tried!`
                    }
                });
            }

            await app.client.chat.postMessage({
                channel: session.channelID,
                thread_ts: session.messageTS,
                text: `BrainBuzz quiz over! Check out the results!`,
                blocks: summaryBlocks
            });
            console.log(`Deleting quiz session with ID ${quizId} from the map.`);
            QuizSessionManager.clear(quizId);
            return;
        }

        // 1️⃣ Listează primele 3 locuri
        topUsersWithImages?.slice(0, 3).forEach((user, i) => {
            const userId = user.userId || user.user_id;
            const displayName = user.user_data.display_name;
            const imageUrl = user.rewardImage;
            summaryBlocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*${ordinal(i + 1)} place* - <@${userId}>`
                },
                accessory: {
                    type: 'image',
                    image_url: imageUrl,
                    alt_text: `Reward for ${user.user_data.display_name}`
                }
            });
        });

        // 2️⃣ Adaugă footer-ul cu numărul de participanți
        summaryBlocks.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `🎉 A total of *${totalParticipants}* user(s) participated in the quiz.`
                }
            ]
        });

        // 3️⃣ Postează în thread, cu text fallback
        await app.client.chat.postMessage({
            channel: session.channelID,
            thread_ts: session.messageTS,

            // notification text
            text: `BrainBuzz quiz over! Check out the results!`,

            blocks: summaryBlocks
        });
        console.log(`Deleting quiz session with ID ${quizId} from the map.`);
        QuizSessionManager.clear(quizId);
    }, remainingMs);
}
