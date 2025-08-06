import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { sendRewardToUser } from './sendRewardToUser.js';

dotenv.config();

export async function sendRewardsToTopUsers(quizId, topUsersWithImages, appInstance) {
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

  } catch (error) {
    console.error(`Error sending reward images to top users: ${error.message}`);
  }
}
