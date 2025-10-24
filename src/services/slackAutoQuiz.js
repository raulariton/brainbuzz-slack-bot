import { postQuiz } from '../utils/commonMethods.js';

class AutoPostQuizService {
    constructor(app) {
        this.app = app;

        // channel to run on (DEBUG)
        // TODO: by default make it run on no channel, then have a command that enables it on a channel
        this.channelId = process.env.AUTO_CHANNEL_ID;
        this.checkFrequencyMs = 2 * 60 * 60 * 1000; // 2 hours

        this.quizTypes = ["historical", "icebreaker", "movie_quote", "computer_trivia"];
    }

    async wasChannelActiveRecently(channelId) {
        // the timestamp of the earliest message we want to consider (in seconds)
        const sinceTs = (Date.now() - this.checkFrequencyMs) / 1000;
        const history = await this.app.client.conversations.history({
            channel: channelId,
            oldest: sinceTs.toString(),
            // we only need to know if there is at least one message
            limit: 1,
        });
        return history.messages && history.messages.length > 0;
    }

    async #run() {
        // run the checker routine (is called every checkFrequencyMs)

        // check if channel inactive
        const active = await this.wasChannelActiveRecently(this.channelId);

        // if channel was active recently
        if (active) {
            console.log(`Channel ${this.channelId} was active recently, not posting quiz. Checking again in ${this.checkFrequencyMs / (60 * 60 * 1000)} hours.`);
            return;
        }

        const randomType = this.quizTypes[Math.floor(Math.random() * this.quizTypes.length)];
        const quizDurationSec = 60; // seconds, 1 minute

        const typeMap = {
            historical: "historical",
            icebreaker: "icebreaker",
            movie_quote: "movie_quote",
            history: "historical",
            funny: "icebreaker",
            movie: "movie_quote",
            computer_trivia: "computer_trivia",
        };

        const backendType = typeMap[randomType] || randomType;

        // channel was not active, post a quiz
        try {
            await postQuiz(backendType, quizDurationSec, this.channelId, this.app, null, randomType)
        } catch (error) {
            console.error("Error running auto post quiz routine: ", error);
        }
    }

    async start() {
        // start the interval to check every checkFrequencyMs
        setInterval(() => this.#run(), this.checkFrequencyMs);

        // force run on routine start
        await this.#run();
    }
}
