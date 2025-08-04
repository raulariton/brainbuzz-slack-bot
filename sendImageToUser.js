import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';

dotenv.config();

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

//functie pentru a lua poza de profil a utilizatorului cu ID-ul folosit ca parametru
export async function getUserProfilePicture(userId) {
  try {
    const result = await slackClient.users.info({ user: userId });
    return result.user.profile.image_512;
  } catch (error) {
    console.error('Could not get user profile picture:', error);
    return null;
  }
}

//functie pentru a face bot-ul sa trimita un mesaj + poza de profil utilizatorului cu ID-ul userId
export async function sendImageToUser(userId, imageUrl, message = 'Here is your image 📎') {
  try {
    // deschidem DM channel-ul deoarece bot-ul trateaza DM-urile tot ca si pe un canal, astfel ca
    // bot-ul nu poate trimite nimic doar prin userId
    const dm = await slackClient.conversations.open({ users: userId });
    const channelId = dm.channel.id;

    // trimitem mesajul si poza
    const result = await slackClient.chat.postMessage({
      channel: channelId,
      text: message,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message,
          },
        },
        {
          type: 'image',
          image_url: imageUrl,
          alt_text: 'Image',
        },
      ],
    });

    console.log('Message sent! Timestamp:', result.ts);
  } catch (error) {
    console.error('Error while sending image:', error);
  }
}
