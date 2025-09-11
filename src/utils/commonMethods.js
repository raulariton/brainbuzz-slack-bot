import ServerClient from '../services/serverClient.js';
import moment from 'moment';
import { handleQuizTimeout } from './handleQuizTimeout.js';
import QuizSessionManager from './QuizSessionManager.js';
import quizTypes from '../utils/quizTypes.json' with { type: 'json' };

export async function postQuiz(quizType, durationSec, targetChannel, app, creatorId = null) {
    // get quiz
    let quiz;
    try {
        quiz = await ServerClient.getQuiz(quizType, durationSec);
    } catch (error) {
        console.error('Error fetching quiz: ', error);
        return null;
    }

    // DEBUG: print correct answer
    console.log('Quiz correct answer:', quiz.answer);

    // store quiz data and metadata in the list of sessions
    // TODO: replace this with a backend call to store the quiz in the database
    const now = Date.now();
    const endTime = now + durationSec * 1000;

    // TODO: conditional message based on whether creatorId is null
    // NOTE: for some reason i have to reassign targetChannel
    //  to another constant targetChannel2
    //  because using targetChannel in `postMessage` gave me
    //  a ReferenceError that targetChannel is not defined yet
    const targetChannel2 = targetChannel;

    // replace quizType with the human-readable version
    quizType = quizTypes[quizType] || quizType;

    // post message with "Start Quiz" button
    try {
        const message = await app.client.chat.postMessage({
            channel: targetChannel2,
            text: 'BrainBuzz Quiz!',
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `${getStartQuizMessageBlock(durationSec, quizType, creatorId)}`
                    }
                },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: { type: 'plain_text', text: 'Start Quiz' },
                            action_id: 'start_quiz',
                            value: quiz.quiz_id
                        }
                    ]
                }
            ]
        });

        QuizSessionManager.insert(quiz.quiz_id, {
            quiz: quiz,
            type: quizType,
            endTime: endTime,
            channelID: message.channel,
            messageTS: message.ts,
            usersAnswered: [],
            creatorUserID: creatorId
        });

        // start timeout
        // NOTE: do not use `await` since it will block the event loop
        handleQuizTimeout(quiz.quiz_id, endTime, app);

        // start updating message with countdown
        updateMessageWithCountdown(
            endTime,
            app,
            quiz,
            message.channel,
            message.ts,
            durationSec,
            quizType,
            creatorId
        );
    } catch (error) {
        console.error('Error occurred posting quiz message: ', error);
        return null;
    }
}

function getStartQuizMessageBlock(remainingSec, quizType, creatorID = null) {
    const duration = moment.duration(remainingSec, 'seconds');
    const remainingCountdown = moment.utc(duration.asMilliseconds()).format('mm:ss');


    if (creatorID) {
        return `<@${creatorID}> has started a new *${quizType} quiz*!\nClick the "Start Quiz" button below to give it a try.\n*Time remaining:* ${remainingCountdown}`;
    } else {
        return `It's too quiet in here! Anyone up for a *${quizType} quiz*?\nClick the "Start Quiz" button below to give it a try.\n*Time remaining:* ${remainingCountdown}`;
    }
}

function getQuizEndMessageBlock(creatorID = null) {
    if (creatorID) {
        return `<@${creatorID}>'s quiz has ended! ⏰ Check out my reply for the results.`;
    } else {
        return `The quiz I created has ended! ⏰ Check out my reply for the results.`;
    }
}

function updateMessageWithCountdown(
    endTime,
    app,
    quiz,
    channelID,
    messageTS,
    durationSec,
    quizType,
    creatorID = null
) {
    let remaining;

    // set interval to update message every 5 seconds
    const intervalID = setInterval(async () => {
        // evaluate remaining time

        remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));

        // if quiz has ended/timed out
        if (remaining <= 0) {
            // quiz ended, stop updating message with countdown
            clearInterval(intervalID);

            // update message to indicate quiz has ended
            try {
                await app.client.chat.update({
                    channel: channelID,
                    ts: messageTS,
                    text: 'BrainBuzz quiz has ended! Check out the results!',
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `${getQuizEndMessageBlock(creatorID)}`
                            }
                        }
                    ]
                });
            } catch (error) {
                console.error('Error updating message to indicate quiz ended: ', error);
            }

            return;
        }

        // update message with remaining time countdown
        try {
            await app.client.chat.update({
                channel: channelID,
                ts: messageTS,
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `${getStartQuizMessageBlock(remaining, quizType, creatorID)}`
                        }
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                text: { type: 'plain_text', text: 'Start Quiz' },
                                action_id: 'start_quiz',
                                value: quiz.quiz_id
                            }
                        ]
                    }
                ]
            });
        } catch (error) {
            console.error('Error updating message with countdown: ', error);
            // will try again next call, so no stopping the updating routine yet
        }
    }, 5000);
}
