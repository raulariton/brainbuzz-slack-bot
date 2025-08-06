import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { sendRewardToUser } from './sendRewardToUser.js';

dotenv.config();

export async function sendRewardsToTopUsers(quizId, appInstance) {
  try {
    // fetch results from the quiz engine
    const response = await fetch(
      'http://localhost:3000/results',
      {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: quizId })
    });

    if (!response.ok) {
      console.error(`Failed to fetch results for quiz ID ${quizId}:`, error.message);
      return;
    }

    const data = await response.json();
    const otherUsers = data.otherUsersWithPlacement || [];
    const topUsersWithRewardImages = data.topUsersWithImages;

    if (!topUsersWithRewardImages || topUsersWithRewardImages.length === 0) {
      console.log(`No users answered quiz ID ${quizId}.`);
      return;
    }

    // send a DM to the top users with their reward images
    for (let i = 0; i < topUsersWithRewardImages.length; i++) {
      const userId = topUsersWithRewardImages[i].user_id;
      const displayName = topUsersWithRewardImages[i].user_data.display_name;
      const firstName = displayName.split(' ')[0];
      const rewardImage = topUsersWithRewardImages[i].rewardImage;

      await sendRewardToUser(userId, firstName, i+1, rewardImage, appInstance);
    }

    console.log("Sent the rewards to the top users successfully.");

    for (const user of otherUsers) {
    const userId = user.user_id;
    const displayName = user.user_data.display_name || '';
    const firstName = displayName.split(' ')[0];
    const placement = user.placement;

    await appInstance.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: userId,
      text: `😢 Salut ${firstName}, ai ieșit pe locul ${placement} și nu ai primit un reward de data asta. Mult succes data viitoare!`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `😢 *Salut ${firstName}*, ai ieșit pe locul *${placement}* și nu ai primit un reward de data asta.\nDar ai fost aproape! Încearcă din nou la următorul quiz!`
          }
        }
      ]
    });
  }

  } catch (error) {
    console.error(`Failed to fetch results for quiz ID ${quizId}:`, error.message);
  }
}
