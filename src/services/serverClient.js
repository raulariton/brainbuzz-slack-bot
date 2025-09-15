import axios from 'axios';

class ServerClient {
    static async getQuiz(type, duration) {
        const url = `${process.env.BACKEND_URL}/quiz`;
        const response = await axios.get(url, {
            params: {
                type: type,
                duration: duration
            }
        });

        return response.data;
    }

    static async sendUserAnswer(quizId, userId, userData, isCorrectAnswer) {
        const url = `${process.env.BACKEND_URL}/answers`;
        const response = await axios.post(url, {
            quiz_id: quizId,
            user_id: userId,
            user_data: userData,
            correct: isCorrectAnswer
        });

        return response.data;
    }

    static async getResults(quizId) {
        const url = `${process.env.BACKEND_URL}/results`;
        const response = await axios.post(url, {
            quizId: quizId,
        });

        return response.data;
    }
}

export default ServerClient;

