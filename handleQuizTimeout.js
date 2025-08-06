import {sendRewardsToTopUsers} from "./sendRewardsToTopUsers.js";

export async function handleQuizTimeout(quizId, quizEndTime, app, quizSessionMap) {
  const now = new Date();
  const remainingMs = quizEndTime - now;

  if (remainingMs <= 0) {
    // TODO: is this check necessary?
    console.log(`Quiz with ID ${quizId} has already expired.`);
    return;
  }

  console.log(`Setting timeout for quiz with ID ${quizId} for ${remainingMs} ms.`);

  setTimeout(async () => {
    console.log(`Quiz with ID ${quizId} has timed out.`);

    // fetch results from quiz engine and send rewards to top 3 users
    await sendRewardsToTopUsers(quizId, app);

    // Cleanup: Remove the session from the quizSessionMap
    console.log(`Deleting quiz session with ID ${quizId} from the map.`);
    quizSessionMap.delete(quizId);

  }, remainingMs);
}