import dotenv from 'dotenv';
import { sendImageToUser, getUserProfilePicture } from './sendImageToUser.js';

dotenv.config();

// Simulăm răspunsul de la QuizEngine
const top3 = [
  { userId: 'U0969LFEQ2K', place: 1 }, // Dennis
  { userId: 'U0969LFEQ2K', place: 2 }, // Razvan
  { userId: 'U0969LFEQ2K', place: 3 }  // Lucas
];

const messages = {
  1: "🏆 Felicitări! Ai ieșit pe locul 1!",
  2: "🥈 Super! Ai ieșit pe locul 2!",
  3: "🥉 Bravo! Ai ieșit pe locul 3!"
};

const test = async () => {
  for (const user of top3) {
    const imageUrl = await getUserProfilePicture(user.userId);
    if (imageUrl) {
      await sendImageToUser(user.userId, imageUrl, messages[user.place]);
    } else {
      console.log(`❌ Nu s-a putut obține poza pentru userId: ${user.userId}`);
    }
  }
};

test();
