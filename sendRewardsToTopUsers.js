import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { sendRewardToUser } from './sendRewardToUser.js';

dotenv.config();

export async function sendRewardsToTopUsers(quizId, topUsersWithImages, otherUsers, appInstance) {
  try {
    if (!topUsersWithImages || topUsersWithImages.length === 0) {
      console.log(`No users answered quiz ID ${quizId}.`);
      return;
    }

    // send a DM to the top users with their reward images
    for (let i = 0; i < topUsersWithImages.length; i++) {
      const userId = topUsersWithImages[i].user_id;
      const displayName = topUsersWithImages[i].user_data.display_name;
      const firstName = displayName.split(' ')[0];
      const rewardImage = topUsersWithImages[i].rewardImage;

      await sendRewardToUser(userId, firstName, i+1, rewardImage, appInstance);
    }

    console.log("Sent the rewards to the top users successfully.");

    // send a DM to the other users (who did not rank in top 3)
    // but first check not null
    if (!otherUsers){
        return;
    }

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
    console.error(`Error sending reward images to top users: ${error.message}`);
  }
}
