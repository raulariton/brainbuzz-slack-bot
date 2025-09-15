import ordinal from 'ordinal';

export async function sendRewardsToTopUsers(quizId, topUsersWithImages, otherUsers, appInstance) {
  try {
    if (!topUsersWithImages || topUsersWithImages.length === 0) {
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


/**
 * Sends a congratulations message with the reward image to the user
 * with given `userId`.
 * @param userId The Slack user ID of the recipient.
 * @param firstName The first name of the user (to personalize the message).
 * @param placement The placement of the user in the quiz (`1`, `2`, `3`, ...).
 * Only the number is needed; Ordinal suffix (like `st`, `nd`, `rd`) is added automatically.
 * @param rewardImage The URL of the reward image to be sent.
 * @param appInstance An instance of the Slack app client, used to send a message
 */
export async function sendRewardToUser(userId, firstName, placement, rewardImage, appInstance) {
    try {
        await appInstance.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: userId,
            text: `🎉 Congrats ${firstName}! You came ${ordinal(placement)}!`, // 1st, 2nd, 3rd
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*🎉 Congrats ${firstName}! You came ${ordinal(placement)}*!\nHere is your *reward*! Looking good!`
                    }
                },
                {
                    type: 'image',
                    image_url: rewardImage,
                    alt_text: `${firstName}'s reward`
                }
            ]
        });
    } catch (error) {
        console.error(`Error sending reward image to ${firstName}:`, error);
    }
}
