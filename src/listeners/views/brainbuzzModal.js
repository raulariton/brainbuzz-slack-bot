import { postQuiz } from '../../utils/commonMethods.js';

/**
 * Listener for the submission of the quiz configuration modal.
 */
export default (app) => {
    app.view('brainbuzz_modal', async ({ ack, body, view, client }) => {
        await ack();
        try {
            // 1️⃣ Validări
            const metadata = view.private_metadata ? JSON.parse(view.private_metadata) : {};
            const originChannel = metadata.originChannel;
            const errors = {};
            const quizTypeOpt = view.state.values.quiz_type_block.quiz_type.selected_option;
            const durationOpt = view.state.values.quiz_duration_block.quiz_duration.selected_option;

            if (!quizTypeOpt) errors.quiz_type_block = 'You must select a quiz type.';
            if (!durationOpt) errors.quiz_duration_block = 'You must select a duration.';

            if (Object.keys(errors).length > 0) {
                // await ack({ response_action: 'errors', errors });
                return;
            }

            // 2️⃣ Extrage valorile alese
            const quizType = quizTypeOpt.value;
            const humanReadableQuizType = quizTypeOpt.text.text;
            const durationSec = Number(durationOpt.value);
            const targetChannel =
                view.state.values.channel_block.channel_select?.selected_conversation;

            const typeMap = { history: 'historical', funny: 'icebreaker', movie: 'movie_quote', computer_trivia: 'computer_trivia' };
            let backendType = typeMap[quizType] || quizType;

            await postQuiz(
                backendType,
                durationSec,
                targetChannel,
                app,
                body.user.id,
                humanReadableQuizType
            );

            // // 3️⃣ Fetch quiz-ul de la backend
            // let quiz;
            // try {
            //     const typeMap = { history: 'historical', funny: 'icebreaker', movie: 'movie_quote', computer_trivia: 'computer_trivia' };
            //     const backendType = typeMap[quizType] || quizType;
            //     quiz = await ServerClient.getQuiz(backendType, durationSec)
            // } catch (err) {
            //     console.error('❌ Error fetching quiz: ', err);
            //     return;
            // }
            //
            // // 4️⃣ Calculează endTime și stochează sesiunea
            // const now = Date.now();
            // const endTime = now + durationSec * 1000;
            //
            // // print correct answer
            // console.log('Quiz correct answer:', quiz.answer);
            //
            // // Meta: cine a creat quiz-ul, ce tip și care e întrebarea
            // const quizTypeLabel = quizTypeOpt.text.text;
            // const questionText = quiz.quizText;
            // const creatorId = body.user.id;
            //
            // // 5️⃣ Trimite mesajul cu butonul “Start Quiz” (doar quiz_id în value)
            // const typeNameMap = {
            //     history: 'Historical',
            //     funny: 'Funny/Icebreaker',
            //     movie: 'Popular quote',
            //     computer_trivia: 'Computer Trivia'
            // };
            //
            // function formatTime(seconds) {
            //     const m = Math.floor(seconds / 60);
            //     const s = seconds % 60;
            //     return `${m}:${s.toString().padStart(2, '0')}`;
            // }
            //
            // // NOTE: for some reason i have to reassign targetChannel
            // //  to another constant targetChannel2
            // //  because using targetChannel in `postMessage` gave me
            // //  a ReferenceError that targetChannel is not defined yet
            // const targetChannel2 = targetChannel;
            // console.log('Target channel for quiz:', targetChannel2);
            // try {
            //     const postResult = await client.chat.postMessage({
            //         channel: targetChannel2,
            //         text: 'BrainBuzz Quiz!',
            //         blocks: [
            //             {
            //                 type: 'section',
            //                 text: {
            //                     type: 'mrkdwn',
            //                     text: `@${body.user.name} has started a new ${typeNameMap[quizType].toLowerCase()} quiz!\nClick the "Start Quiz" button below to give it a try.\n*Time remaining:* ${formatTime(durationSec)}`
            //                 },
            //             },
            //             {
            //                 type: 'actions',
            //                 elements: [
            //                     {
            //                         type: 'button',
            //                         text: { type: 'plain_text', text: 'Start Quiz' },
            //                         action_id: 'start_quiz',
            //                         value: quiz.quiz_id
            //                     }
            //                 ]
            //             },
            //             {
            //                 type: 'image',
            //                 image_url: quiz.imageUrl,
            //                 alt_text: 'Quiz Image'
            //             }
            //         ]
            //     });
            //
            //     QuizSessionManager.insert(quiz.quiz_id, {
            //         quiz: quiz,
            //         type: quizTypeLabel,
            //         endTime: endTime,
            //         channelID: postResult.channel,
            //         messageTS: postResult.ts,
            //         usersAnswered: [],
            //         creatorUserID: creatorId
            //     });
            //
            //     // start timeout
            //     // NOTE: do not use `await` since it will block the event loop
            //     handleQuizTimeout(quiz.quiz_id, endTime, app);
            //
            //     // 6. Update la fiecare 5 secunde
            //     let remaining = durationSec;
            //
            //     const intervalId = setInterval(async () => {
            //         remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            //
            //         if (remaining <= 0) {
            //             clearInterval(intervalId);
            //             await client.chat.update({
            //                 channel: targetChannel,
            //                 ts: messageTs,
            //                 text: 'Quiz closed!',
            //                 blocks: [
            //                     {
            //                         type: 'section',
            //                         text: {
            //                             type: 'mrkdwn',
            //                             text: `@${body.user.name}'s quiz has ended! ⏰`
            //                         }
            //                     }
            //                 ]
            //             });
            //             return;
            //         }
            //
            //         await client.chat.update({
            //             channel: targetChannel,
            //             ts: messageTs,
            //             blocks: [
            //                 {
            //                     type: 'section',
            //                     text: {
            //                         type: 'mrkdwn',
            //                         text: `@${body.user.name} has started a new ${typeNameMap[quizType].toLowerCase()} quiz!\nClick the "Start Quiz" button below to give it a try.\n*Time remaining:* ${formatTime(remaining)}`
            //                     }
            //                 },
            //                 {
            //                     type: 'actions',
            //                     elements: [
            //                         {
            //                             type: 'button',
            //                             text: { type: 'plain_text', text: 'Start Quiz' },
            //                             action_id: 'start_quiz',
            //                             value: quiz.quiz_id
            //                         }
            //                     ]
            //                 },
            //                 {
            //                     type: 'image',
            //                     image_url: quiz.imageUrl,
            //                     alt_text: 'Quiz Image'
            //                 }
            //             ]
            //         });
            //     }, 5000);
            // } catch (error) {
            //     console.error('❌ Error posting Start Quiz message:', error);
            // }
        } catch (err) {
            console.error(err);
        }
    });
}