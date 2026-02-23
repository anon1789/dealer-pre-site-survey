import { create } from 'zustand';

export type ResponseValue = 'Yes' | 'Partially' | 'No' | 'N/A' | null;

export interface SurveyResponseData {
    question_text: string;
    response_value: ResponseValue;
    comments: string;
    photo_uri?: string;
}

interface SurveyState {
    dealerId: string | null;
    surveyId: string | null;
    responses: Record<string, Record<string, SurveyResponseData>>;
    setDealerId: (id: string) => void;
    setSurveyId: (id: string) => void;
    setResponse: (category: string, question: string, value: Partial<SurveyResponseData>) => void;
    reset: () => void;
}

export const useSurveyStore = create<SurveyState>((set) => ({
    dealerId: null,
    surveyId: null,
    responses: {},
    setDealerId: (id) => set({ dealerId: id }),
    setSurveyId: (id) => set({ surveyId: id }),
    setResponse: (category, question, value) => set((state) => {
        const catResponses = state.responses[category] || {};
        const existingQ = catResponses[question] || { question_text: question, response_value: null, comments: '' };
        return {
            responses: {
                ...state.responses,
                [category]: {
                    ...catResponses,
                    [question]: { ...existingQ, ...value }
                }
            }
        };
    }),
    reset: () => set({ dealerId: null, surveyId: null, responses: {} })
}));
