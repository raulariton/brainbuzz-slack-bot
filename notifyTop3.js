import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { sendImageToUser } from './sendImageToUser.js';

dotenv.config();

const QUIZ_ENGINE_URL = process.env.QUIZ_ENGINE_URL || 'http://localhost:3000/results';
const QUIZ_ID = process.env.QUIZ_ID || 'quiz_id_placeholder';

const messages = {
  0: "🏆 Congrats! You got the first place!",
  1: "🥈 Congrats! You got the second place!",
  2: "🥉 Congrats! You got the third place!"
};

export async function notifyTop3() {
  try {
    // console.log("Trimit request către:", QUIZ_ENGINE_URL);
    // console.log("Folosesc quizId:", QUIZ_ID);

    const response = await fetch(QUIZ_ENGINE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: QUIZ_ID })
    });

    if (!response.ok) {
    //   console.error('Eroare la fetch /results:', response.status);
      return;
    }

    const data = await response.json();

    //Log complet răspuns primit
    //console.log('📥 Răspuns primit de la Quiz Engine:\n', JSON.stringify(data, null, 2));

    const top3 = data.topUsersWithImages;

    if (!top3 || top3.length === 0) {
      console.log('There aren\'t any users in top 3.');
      return;
    }

    for (let i = 0; i < top3.length; i++) {
      const user = top3[i];
      const userId = user.userId || user.user_id;
      const displayName = user.displayName || user.user_data?.display_name || 'unknown';
      const profilePic = user.profilePicture || user.user_data?.profile_picture || 'N/A';
      const rewardImage = user.rewardImage;
      const fallbackImage = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';
      const message = messages[i] || "🎉 Congrats!";
      const imageToSend = rewardImage || fallbackImage;

      if (!userId) {
        console.warn(`⚠️ There is no userId:`, user);
        continue;
      }

      //Log detaliat pentru debugging imagine
    //   console.log(`\n Locul ${i + 1}: ${displayName}`);
    //   console.log(`userId: ${userId}`);
    //   console.log(`Profile pic: ${profilePic}`);
    //   console.log(`Reward image: ${rewardImage ? '✅ OK' : '❌ NULL (se trimite fallback)'}`);
    //   console.log(`Trimit DM cu mesaj: ${message}`);

      await sendImageToUser(userId, imageToSend, message);
    }

    //console.log("\n✅ DM-urile au fost trimise cu succes!");

  } catch (err) {
    console.error('❌ Error in notifyTop3:', err);
  }
}
