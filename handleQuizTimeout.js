import { sendRewardsToTopUsers } from './sendRewardsToTopUsers.js';
import axios from 'axios';

export async function handleQuizTimeout(quizId, quizEndTime, app, quizSessionMap) {
    const now = new Date();
    const remainingMs = quizEndTime - now;

    if (remainingMs <= 0) {
        // TODO: is this check necessary?
        console.log(`Quiz with ID ${quizId} has already expired.`);
        return;
    }

    console.log(`Setting timeout for quiz with ID ${quizId} for ${remainingMs} ms.`);

    setTimeout(async () => {
        console.log(`Quiz with ID ${quizId} has timed out.`);

        // fetch results from quiz engine and send rewards to top 3 users
        await sendRewardsToTopUsers(quizId, app);

        const session = quizSessionMap.get(quizId);
        if (!session) {
            console.warn(`No session found for quiz ${quizId}, skipping summary post.`);
            return;
        }
        const totalParticipants = session?.usersAnswered?.length || 0;

        let topUsers = [];
        try {
            const res = await axios.post('http://localhost:3000/results', { quizId });
            console.log('🔎 topUsersWithImages:', res.data.topUsersWithImages);
            topUsers = res.data.topUsersWithImages || [];
        } catch (err) {
            console.log('Error fetching the summary results:', err);
        }

        const summaryBlocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*🏁 The quiz is over!*'
                }
            }
        ];

        // 1️⃣ Listează primele 3 locuri
        topUsers.slice(0, 3).forEach((user, i) => {
            const userId = user.userId || user.user_id;
            const imageUrl = user.rewardImage;
            summaryBlocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*${i + 1}.* <@${userId}>`
                },
                accessory: {
                    type: 'image',
                    image_url: imageUrl,
                    alt_text: `Reward pentru ${userId}`
                }
            });
        });

        // 2️⃣ Adaugă footer-ul cu numărul de participanți
        summaryBlocks.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `🎉 There were *${totalParticipants}* users.`
                }
            ]
        });

        // 3️⃣ Postează în thread, cu text fallback
        await app.client.chat.postMessage({
            channel: session.channel,
            thread_ts: session.threadTs,
            text: `Quiz ${quizId} is over! Top 3: ${topUsers
                .slice(0, 3)
                .map((u, i) => `${i + 1}. <@${u.userId || u.user_id}>`)
                .join(', ')}`,
            blocks: summaryBlocks
        });
        console.log(`Deleting quiz session with ID ${quizId} from the map.`);
        quizSessionMap.delete(quizId);
    }, remainingMs);
}
