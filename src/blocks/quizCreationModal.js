import moment from 'moment';
import ServerClient from '../services/serverClient.js';

const locale = 'en'

// all supported quiz durations
const durations = [
    moment.duration(30, 'seconds'),
    moment.duration(1, 'minute'),
    moment.duration(5, 'minutes'),
    moment.duration(10, 'minutes'),
    moment.duration(30, 'minutes'),
    moment.duration(1, 'hour'),
    moment.duration(2, 'hours'),
    moment.duration(4, 'hours'),
    moment.duration(8, 'hours'),
    moment.duration(24, 'hours')
]

// switch locale to use humanize()
moment.locale(locale);

const durationOptions = durations.map(duration => {
    return {
        text: {
            type: 'plain_text',
            text: duration.humanize(),
        },
        value: `${duration.asSeconds()}`
    }
})


export default async function quizCreationModal() {

    const quizTypeOptions = await ServerClient.getQuizTypes()

    return [
        // quiz type input field
        {
            type: 'input',
            block_id: 'quiz_type_block',
            element: {
                type: 'static_select',
                action_id: 'quiz_type',
                placeholder: {
                    type: 'plain_text',
                    text: 'What quiz would you like to play?'
                },
                options: quizTypeOptions
            },
            label: {
                type: 'plain_text',
                text: 'Quiz Type'
            }
        },
        // channel select input field
        {
            type: 'input',
            block_id: 'channel_block',
            element: {
                type: 'conversations_select',
                action_id: 'channel_select',
                placeholder: {
                    type: 'plain_text',
                    text: 'Where should the quiz be posted?'
                },
                filter: {
                    include: ['public', 'private'],
                    exclude_bot_users: true
                }
            },
            label: {
                type: 'plain_text',
                text: 'Channel to post quiz in'
            }
        },
        // quiz duration input field
        {
            type: 'input',
            block_id: 'quiz_duration_block',
            element: {
                type: 'static_select',
                action_id: 'quiz_duration',
                placeholder: {
                    type: 'plain_text',
                    text: 'How long should the quiz last?'
                },
                options: durationOptions
            },
            label: {
                type: 'plain_text',
                text: 'Quiz Duration'
            }
        }
    ]
}