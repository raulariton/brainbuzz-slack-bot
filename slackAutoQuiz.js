import axios from "axios";
import { startQuizFlow } from "./quizFlow.js"; // ajustează calea corect

export default function initSlackAutoQuiz(app, quizSessionMap) {
  const AUTO_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  const quizTypes = ["historical", "icebreaker", "movie_quote"];

  function getRandomType() {
    return quizTypes[Math.floor(Math.random() * quizTypes.length)];
  }

  async function wasChannelActiveRecently(channelId, hours = 2) {
    // corectat interval la 2 ore (2*3600*1000 ms)
    const sinceTs = (Date.now() - 120 * 1000) / 1000;
    const history = await app.client.conversations.history({
      channel: channelId,
      oldest: sinceTs.toString(),
      limit: 1,
    });
    return history.messages && history.messages.length > 0;
  }

  async function autoPostQuiz() {
    try {
      const active = await wasChannelActiveRecently(AUTO_CHANNEL_ID, 2);
      if (active) {
        console.log("⚠️ Canalul a fost activ în ultimele 2 ore. Nu postez quiz.");
        return;
      }

      const randomType = getRandomType();
      const durationSec = 60;

      // Folosește startQuizFlow, trimite parametrii necesari
      const quizId = await startQuizFlow({
        app,
        client: app.client,
        quizSessionMap,
        user: { id: "auto-bot", name: "AutoBot" },
        channel: AUTO_CHANNEL_ID,
        quizType: randomType,
        durationSec,
      });

      if (quizId) {
        console.log("✅ Quiz automat postat cu succes, id:", quizId);
      }
    } catch (err) {
      console.error("❌ Eroare la autoPostQuiz:", err);
    }
  }

  // Interval la 10 minute (600000 ms)
  setInterval(autoPostQuiz, 15 * 1000);

  // Optional: poți să pornești prima oară imediat
  autoPostQuiz();
}
