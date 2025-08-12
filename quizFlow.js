    import axios from "axios";

    
export async function startQuizFlow({
  app,
  client,
  quizSessionMap,
  user,
  channel,
  quizType,
  durationSec,
  originChannel, // optional, poți omite dacă nu ai nevoie
}) {
  try {
    // 1️⃣ Mapează tipul la ce cere backendul
    const typeMap = {
      historical: "historical",
      icebreaker: "icebreaker",
      movie_quote: "movie_quote",
      history: "historical", // suportă sinonime
      funny: "icebreaker",
      movie: "movie_quote",
    };

    const backendType = typeMap[quizType] || quizType;

    // 2️⃣ Cere quiz de la backend
    const res = await axios.get(
      `http://localhost:3000/quiz?type=${backendType}&duration=${durationSec}`
    );
    const quiz = res.data;
    if (!quiz) throw new Error("No quiz data received");

    // 3️⃣ Calculează endTime și creează ID pentru sesiune
    const now = Date.now();
    const endTime = now + durationSec * 1000;
    const quizId = quiz.quiz_id || `quiz_${Date.now()}`;

    // 4️⃣ Stochează sesiunea în map
    quizSessionMap.set(quizId, {
      quiz,
      endTime,
      usersAnswered: [],
      creatorId: user.id,
      type: quizType,
      question: quiz.quizText,
    });

    // 5️⃣ Funcție pentru formatat timpul în mm:ss
    function formatTime(seconds) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    }

    // 6️⃣ Postează mesajul în canal cu buton Start Quiz
    const typeNameMap = {
      historical: "Historical",
      icebreaker: "Funny/Icebreaker",
      movie_quote: "Popular quote",
    };

    const postResult = await client.chat.postMessage({
      channel,
      text: "BrainBuzz Quiz!",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `@${user.name} has started a new ${typeNameMap[quizType]?.toLowerCase() || quizType} quiz!\nClick the *Start Quiz* button below to give it a try.\n*Time remaining:* ${formatTime(durationSec)}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Start Quiz" },
              action_id: "start_quiz",
              value: quizId,
            },
          ],
        },
        ...(quiz.imageUrl
          ? [
              {
                type: "image",
                image_url: quiz.imageUrl,
                alt_text: "Quiz Image",
              },
            ]
          : []),
      ],
    });

    const messageTs = postResult.ts;

    // 7️⃣ Actualizează sesiunea cu info despre canal și thread_ts
    quizSessionMap.set(quizId, {
      ...quizSessionMap.get(quizId),
      channel: postResult.channel,
      threadTs: messageTs,
    });

    // 8️⃣ Setează interval care actualizează mesajul la fiecare 5 secunde
    let remaining = durationSec;
    const intervalId = setInterval(async () => {
      remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));

      if (remaining <= 0) {
        clearInterval(intervalId);
        await client.chat.update({
          channel,
          ts: messageTs,
          text: "Quiz closed!",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `⏰ The quiz has ended!`,
              },
            },
          ],
        });
        return;
      }

      await client.chat.update({
        channel,
        ts: messageTs,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `@${user.name} has started a new ${typeNameMap[quizType]?.toLowerCase() || quizType} quiz!\nClick the *Start Quiz* button below to give it a try.\n*Time remaining:* ${formatTime(remaining)}`,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Start Quiz" },
                action_id: "start_quiz",
                value: quizId,
              },
            ],
          },
          ...(quiz.imageUrl
            ? [
                {
                  type: "image",
                  image_url: quiz.imageUrl,
                  alt_text: "Quiz Image",
                },
              ]
            : []),
        ],
      });
    }, 5000);

    // 9️⃣ Poți să apelezi aici funcția de timeout dacă o ai, ex:
    // handleQuizTimeout(quizId, endTime, app, quizSessionMap);

    return quizId; // întoarce id-ul quiz-ului
  } catch (err) {
    console.error("❌ Eroare în startQuizFlow:", err);
    return null;
  }
}
