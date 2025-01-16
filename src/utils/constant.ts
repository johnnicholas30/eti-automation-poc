export const EMPTY_TEMPLATE_FORM_ID =
  '1AVVAOVjjZBWXaOlYSFAVXxs8OpCoNVrJ9Dq0oSEvuVA';

export const INTRO_FORM_ID = '13LE8e3p_PPel6otrvtDHxHF6me0DMhfAxEoTfZAx4JQ';

export const INTRO_FORM = {
  formId: '13LE8e3p_PPel6otrvtDHxHF6me0DMhfAxEoTfZAx4JQ',
  info: {
    title: 'Follow-up Questionnaire: Application [x]',
    documentTitle: 'Intro Questions',
  },
  settings: {},
  revisionId: '00000046',
  responderUri:
    'https://docs.google.com/forms/d/e/1FAIpQLSdeqqyvYonbSdz0uHYNDdzwE76BtMqZ0KNvEK2uIllD7DH5Rw/viewform',
  items: [
    {
      itemId: '3f7b8aa6',
      title: 'Full Name',
      questionItem: {
        question: {
          questionId: '11baec0c',
          required: true,
          textQuestion: {},
        },
      },
    },
    {
      itemId: '61a8fedf',
      title: 'Date of Birth (mm/dd/yy)',
      questionItem: {
        question: {
          questionId: '6f308023',
          required: true,
          dateQuestion: {
            includeYear: true,
          },
        },
      },
    },
    {
      itemId: '02843e07',
      title: 'Last 4 Digits of Social Security Number',
      questionItem: {
        question: {
          questionId: '34974c12',
          required: true,
          textQuestion: {},
        },
      },
    },
    {
      itemId: '12aeb734',
      questionGroupItem: {
        questions: [
          {
            questionId: '16244ad4',
            required: true,
            rowQuestion: {
              title:
                'I declare that I will answer all questions thoroughly, truthfully, and accurately to the best of my knowledge.',
            },
          },
          {
            questionId: '22850d4b',
            required: true,
            rowQuestion: {
              title:
                'I understand that these answers will be used by Banner Life Insurance Company, along with the information disclosed in my application, to make a decision on my application for insurance.',
            },
          },
        ],
        grid: {
          columns: {
            type: 'CHECKBOX',
            options: [
              {
                value: 'I agree.',
              },
            ],
          },
        },
      },
      title: 'Please acknowledge the following:',
    },
  ],
};
