import dotenv from 'dotenv';
import { sendImageToUser, getUserProfilePicture } from './sendImageToUser.js';

dotenv.config();

const userId = 'U0969LFEQ2K';
// U0969LFEQ2K - Dennis
// U0969LNGGJ3 - Razvan
// U0969LDU279 - Alex
// U0969LJJNET - Lucas
// U0969LL3SK1 - Raul
// U096277KWN7 - Alex Berlo
// U096N1RDZL5 - Cristi
const message = 'Ti-am furat poza de profil! :D';
const test = async (id) => {
  const profileImageUrl = await getUserProfilePicture(id);

  if (profileImageUrl) {
    await sendImageToUser(id, profileImageUrl, message);
  } else {
    console.log('Could not retrieve profile picture');
  }
};

test(userId);
//test('U0969LNGGJ3');
//test('U0969LJJNET');
//test('U0969LL3SK1');

test('U096277KWN7');
test('U096N1RDZL5');