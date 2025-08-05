import { WebClient } from '@slack/web-api';
import ordinal from "ordinal";


// TODO: probably unused, so can be removed
export async function getUserProfilePicture(userId) {
  const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

  try {
    const result = await slackClient.users.info({ user: userId });
    return result.user.profile.image_512;
  } catch (error) {
    console.error('Could not get user profile picture:', error);
    return null;
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
