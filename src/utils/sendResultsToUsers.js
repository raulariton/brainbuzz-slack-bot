import ordinal from 'ordinal';

export async function sendResultsToUsers(quizId, topUsersWithImages, otherUsers, appInstance) {
  try {
    if (!topUsersWithImages || topUsersWithImages.length === 0) {
      return;
    }

    // send a DM to the top users with their reward images (if any)
    for (let i = 0; i < topUsersWithImages.length; i++) {
      const userId = topUsersWithImages[i].user_id;
      const displayName = topUsersWithImages[i].user_data.display_name;
      const firstName = displayName.split(' ')[0];
      const rewardImage = topUsersWithImages[i].rewardImage || null

      await sendResultToUser(userId, firstName, i+1, rewardImage, appInstance);
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
      text: `Your results for the quiz`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${firstName}, you came *${ordinal(placement)}*. You answered correctly but others beat you to it. Better luck next time! Thank you for participating!`
          }
        }
      ]
    });
  }

  } catch (error) {
    console.error(`Error sending reward images to top users: ${error.message}`);
  }
}


/**
 * Sends a congratulations message with the reward image (if any) to the user
 * with given `userId`.
 * @param userId The Slack user ID of the recipient.
 * @param firstName The first name of the user (to personalize the message).
 * @param placement The placement of the user in the quiz (`1`, `2`, `3`, ...).
 * Only the number is needed; Ordinal suffix (like `st`, `nd`, `rd`) is added automatically.
 * @param rewardImage The URL of the reward image to be sent (null if no image received).
 * @param appInstance An instance of the Slack app client, used to send a message
 */
export async function sendResultToUser(userId, firstName, placement, rewardImage, appInstance) {
    try {
        await appInstance.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: userId,
            text: `🎉 Congrats ${firstName}!`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*🎉 Congrats ${firstName}! You came ${ordinal(placement)}*! Thanks for participating!${rewardImage ? '\nHere is your *reward*! Looking good!' : ''}` // we use ordinal to add suffix (st, nd, rd, th)
                    }
                },
                ... (rewardImage ? [{
                    type: 'image',
                    image_url: rewardImage,
                    alt_text: `${firstName}'s reward`
                    }] : [])
            ]
        });
    } catch (error) {
        console.error(`Error sending result to ${firstName}:`, error);
    }
}
