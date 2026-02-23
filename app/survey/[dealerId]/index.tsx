import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SURVEY_STEPS } from '../../../constants/questions';
import { useSurveyStore } from '../../../store/surveyStore';
import QuestionCard from '../../../components/QuestionCard';
import MagneticButton from '../../../components/MagneticButton';
import Animated, { useAnimatedStyle, withSpring, interpolateColor } from 'react-native-reanimated';
import { supabase } from '../../../utils/supabase';
import * as Network from 'expo-network';
import { useOfflineStore } from '../../../store/offlineStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SurveyWizard() {
    const { dealerId } = useLocalSearchParams();
    const router = useRouter();
    const { setDealerId, responses, reset } = useSurveyStore();
    const [submitting, setSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{ text: string, stepIndex: number }[]>([]);
    const [submissionResult, setSubmissionResult] = useState<{ type: 'draft' | 'submit' | 'error', message: string } | null>(null);
    const [weights, setWeights] = useState<Record<string, number>>({});
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);

    const scrollViewRef = useRef<ScrollView>(null);
    const sectionOffsets = useRef<{ [key: number]: number }>({});

    // Keep active section in viewport
    const handleScroll = (e: any) => {
        const y = e.nativeEvent.contentOffset.y;
        let newIndex = 0;
        // Activate section when it enters within 300px of the top edge
        const triggerY = y + 300;

        const indexes = Object.keys(sectionOffsets.current).map(Number).sort((a, b) => a - b);
        for (let i = 0; i < indexes.length; i++) {
            if (triggerY >= sectionOffsets.current[indexes[i]]) {
                newIndex = indexes[i];
            }
        }

        if (newIndex !== activeSectionIndex) {
            setActiveSectionIndex(newIndex);
        }
    };

    useEffect(() => {
        const fetchWeights = async () => {
            try {
                const stored = await AsyncStorage.getItem('@survey_weights');
                if (stored) {
                    const data = JSON.parse(stored);
                    const wMap: Record<string, number> = {};
                    data.forEach((d: any) => wMap[d.category] = Number(d.weight));
                    setWeights(wMap);
                    return;
                }
            } catch (e) { }

            setWeights({
                'Visibility & Accessibility': 20,
                'Parking & Traffic Flow': 20,
                'Customer Journey Potential': 20,
                'Brand Identity Feasibility': 15,
                'Facility & Technical Readiness': 15,
                'Charging & Signage Readiness': 10,
                'Compliance': 0
            });
        };
        fetchWeights();

        // Reset and initialize when entering an assessment
        reset();
        if (typeof dealerId === 'string') {
            setDealerId(dealerId);
            loadDraft(dealerId);
        }
    }, [dealerId]);

    const loadDraft = async (dId: string) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;

        const { data: drafts } = await supabase.from('surveys')
            .select('id')
            .eq('dealer_id', dId)
            .eq('user_id', userData.user.id)
            .eq('status', 'Draft')
            .order('created_at', { ascending: false })
            .limit(1);

        if (drafts && drafts.length > 0) {
            const draftId = drafts[0].id;
            const { data: responsesData } = await supabase.from('survey_responses').select('*').eq('survey_id', draftId);

            if (responsesData) {
                responsesData.forEach((r: any) => {
                    useSurveyStore.getState().setResponse(r.category, r.question_text, {
                        response_value: r.response_value,
                        comments: r.comments,
                    });
                });
            }
        }
    };

    let answeredQuestions = 0;
    let totalQs = 0;
    SURVEY_STEPS.forEach(step => {
        const catResponses = responses[step.title] || {};
        step.questions.forEach(q => {
            totalQs++;
            if (catResponses[q]?.response_value) answeredQuestions++;
        });
    });
    const progressPercent = totalQs === 0 ? 0 : Math.round((answeredQuestions / totalQs) * 100);

    const handleSubmit = async () => {
        setValidationErrors([]);

        // Full survey validation before submit
        let isFullyValid = true;
        const missingFields: { text: string, stepIndex: number }[] = [];
        for (let i = 0; i < SURVEY_STEPS.length; i++) {
            const step = SURVEY_STEPS[i];
            const catResponses = responses[step.title] || {};
            for (let j = 0; j < step.questions.length; j++) {
                const q = step.questions[j];
                if (!catResponses[q]?.response_value) {
                    isFullyValid = false;
                    missingFields.push({ text: `Question ${i + 1}.${j + 1} from ${step.title}`, stepIndex: i });
                }
            }
        }

        if (!isFullyValid) {
            setValidationErrors(missingFields);
            return;
        }

        await submitSurvey();
    };

    const handleBack = async () => {
        setValidationErrors([]);
        await saveDraft(true);
    };

    const calculateScoreAndRecommendation = () => {
        let complianceFail = false;
        let totalPossibleWeight = 0;
        let earnedWeightedScore = 0;

        Object.entries(responses).forEach(([cat, qs]) => {
            const catWeight = weights[cat] || (cat === 'Compliance (Gatekeeper)' || cat.includes('Compliance') ? 0 : (100 / 6));
            let catQuestions = 0;
            let catPointsEarned = 0;

            Object.entries(qs).forEach(([q, val]) => {
                if (cat === 'Compliance (Gatekeeper)' || cat.includes('Compliance')) {
                    if (val.response_value === 'No') complianceFail = true;
                } else {
                    if (val.response_value !== 'N/A' && val.response_value) {
                        catQuestions++;
                        if (val.response_value === 'Yes') catPointsEarned += 1;
                        if (val.response_value === 'Partially') catPointsEarned += 0.5;
                    }
                }
            });

            if (catQuestions > 0 && cat !== 'Compliance (Gatekeeper)' && !cat.includes('Compliance')) {
                const catScorePercentage = catPointsEarned / catQuestions; // 0.0 to 1.0
                earnedWeightedScore += (catScorePercentage * catWeight);
                totalPossibleWeight += catWeight;
            }
        });

        let overallPercent = totalPossibleWeight === 0 ? 0 : earnedWeightedScore / totalPossibleWeight;
        let rawScore = Math.round(overallPercent * 100);

        let rec = 'Suitable';
        if (complianceFail || rawScore < 60) rec = 'Not Suitable';
        else if (rawScore >= 60 && rawScore < 75) rec = 'Suitable with Improvements';

        return { overall_score: rawScore, recommendation: rec };
    };

    const submitSurvey = async () => {
        setSubmitting(true);
        const { data: userData } = await supabase.auth.getUser();

        if (!userData?.user) {
            setSubmissionResult({ type: 'error', message: "Session Expired. Please log in again." });
            setSubmitting(false);
            return;
        }

        const { overall_score, recommendation } = calculateScoreAndRecommendation();
        const networkState = await Network.getNetworkStateAsync();

        if (!networkState.isConnected) {
            useOfflineStore.getState().addRecord({
                id: Date.now().toString(),
                dealer_id: typeof dealerId === 'string' ? dealerId : dealerId[0],
                type: 'submit',
                responses,
                overall_score,
                recommendation,
                timestamp: Date.now()
            });
            setSubmitting(false);
            setSubmissionResult({
                type: 'submit',
                message: `[OFFLINE MODE] Saved locally.\nScore: ${overall_score}%\nRecommendation: ${recommendation}`
            });
            return;
        }

        // Check for existing draft
        const { data: existingDrafts, error: fetchError } = await supabase.from('surveys')
            .select('id')
            .eq('dealer_id', typeof dealerId === 'string' ? dealerId : dealerId[0])
            .eq('user_id', userData.user.id)
            .eq('status', 'Draft')
            .order('created_at', { ascending: false })
            .limit(1);

        if (fetchError) {
            setSubmissionResult({ type: 'error', message: `Submission Failed: Invalid ID format or DB Error: ${fetchError.message}` });
            setSubmitting(false);
            return;
        }

        let surveyIdToUse = existingDrafts?.[0]?.id;

        if (surveyIdToUse) {
            const { error: updateError } = await supabase.from('surveys').update({
                status: 'Completed',
                overall_score,
                recommendation
            }).eq('id', surveyIdToUse);
            if (updateError) {
                setSubmissionResult({ type: 'error', message: `Submission Failed: ${updateError.message}` });
                setSubmitting(false);
                return;
            }
            await supabase.from('survey_responses').delete().eq('survey_id', surveyIdToUse);
        } else {
            const { data: survey, error: surveyError } = await supabase.from('surveys').insert({
                dealer_id: typeof dealerId === 'string' ? dealerId : dealerId[0],
                user_id: userData.user.id,
                status: 'Completed',
                overall_score,
                recommendation
            }).select().single();
            if (surveyError || !survey) {
                setSubmissionResult({ type: 'error', message: `Submission Failed: ${surveyError?.message || 'Unknown error'}` });
                setSubmitting(false);
                return;
            }
            surveyIdToUse = survey.id;
        }

        // insert responses
        const responseInserts: any[] = [];
        Object.entries(responses).forEach(([category, qs]) => {
            Object.entries(qs).forEach(([q, value]) => {
                let score = null;
                if (value.response_value === 'Yes') score = 1;
                if (value.response_value === 'Partially') score = 0.5;
                if (value.response_value === 'No') score = 0;

                responseInserts.push({
                    survey_id: surveyIdToUse,
                    category,
                    question_text: q,
                    response_value: value.response_value,
                    score,
                    comments: value.comments
                });
            });
        });

        if (responseInserts.length > 0) {
            await supabase.from('survey_responses').insert(responseInserts);
        }

        setSubmitting(false);
        setSubmissionResult({
            type: 'submit',
            message: `Score: ${overall_score}%\nRecommendation: ${recommendation}`
        });
    };

    const saveDraft = async (navBack: boolean = false) => {
        setSubmitting(true);
        const { data: userData } = await supabase.auth.getUser();

        if (!userData?.user) {
            setSubmissionResult({ type: 'error', message: "Session Expired. Please log in again." });
            setSubmitting(false);
            return;
        }

        let answered = 0;
        let total = 0;
        SURVEY_STEPS.forEach(step => {
            const catResponses = responses[step.title] || {};
            step.questions.forEach(q => {
                total++;
                if (catResponses[q]?.response_value) answered++;
            });
        });

        const progressPercent = Math.round((answered / total) * 100);
        const networkState = await Network.getNetworkStateAsync();

        if (!networkState.isConnected) {
            useOfflineStore.getState().addRecord({
                id: Date.now().toString(),
                dealer_id: typeof dealerId === 'string' ? dealerId : dealerId[0],
                type: 'draft',
                responses,
                overall_score: progressPercent,
                recommendation: 'Draft',
                timestamp: Date.now()
            });
            setSubmitting(false);
            if (navBack) {
                router.back();
            } else {
                setSubmissionResult({ type: 'draft', message: '[OFFLINE MODE] Draft saved to local storage.' });
            }
            return;
        }

        const { data: existingDrafts } = await supabase.from('surveys')
            .select('id')
            .eq('dealer_id', dealerId)
            .eq('user_id', userData.user.id)
            .eq('status', 'Draft')
            .order('created_at', { ascending: false })
            .limit(1);

        let surveyIdToUse = existingDrafts?.[0]?.id;

        if (surveyIdToUse) {
            await supabase.from('surveys').update({ overall_score: progressPercent }).eq('id', surveyIdToUse);
            await supabase.from('survey_responses').delete().eq('survey_id', surveyIdToUse);
        } else {
            const { data: newSurvey, error: surveyError } = await supabase.from('surveys').insert({
                dealer_id: typeof dealerId === 'string' ? dealerId : dealerId[0],
                user_id: userData.user.id,
                status: 'Draft',
                overall_score: progressPercent
            }).select().single();

            if (surveyError || !newSurvey) {
                setSubmissionResult({ type: 'error', message: `Error: Could not save draft. Database error: ${surveyError?.message || 'Unknown error'}` });
                setSubmitting(false);
                return;
            }
            surveyIdToUse = newSurvey.id;
        }

        const responseInserts: any[] = [];
        Object.entries(responses).forEach(([category, qs]) => {
            Object.entries(qs).forEach(([q, value]) => {
                if (value.response_value) {
                    let score = null;
                    if (value.response_value === 'Yes') score = 1;
                    if (value.response_value === 'Partially') score = 0.5;
                    if (value.response_value === 'No') score = 0;

                    responseInserts.push({
                        survey_id: surveyIdToUse,
                        category,
                        question_text: q,
                        response_value: value.response_value,
                        score,
                        comments: value.comments
                    });
                }
            });
        });

        if (responseInserts.length > 0) {
            await supabase.from('survey_responses').insert(responseInserts);
        }

        setSubmitting(false);
        if (navBack) {
            router.back();
        } else {
            setSubmissionResult({ type: 'draft', message: 'Your work has been saved. You can resume at any time.' });
        }
    };

    if (submissionResult) {
        return (
            <SafeAreaView className="flex-1 bg-[#f4f4f7] justify-center px-6">
                <View className="w-full max-w-sm self-center bg-white p-8 rounded-[32px] items-center shadow-lg border border-[#eaedf2]">
                    <Text className={`text-2xl font-bold mb-4 ${submissionResult.type === 'error' ? 'text-red-600' : 'text-slate-800'}`}>
                        {submissionResult.type === 'error' ? 'Error' : submissionResult.type === 'draft' ? 'Saved' : 'Complete'}
                    </Text>

                    <Text className="text-center mb-8 text-slate-500 text-base">
                        {submissionResult.message}
                    </Text>

                    <View className="w-full">
                        {submissionResult.type === 'error' ? (
                            <TouchableOpacity className="w-full bg-red-600 py-4 rounded-xl items-center justify-center" onPress={() => setSubmissionResult(null)}>
                                <Text className="text-white font-bold text-base">Try Again</Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                <TouchableOpacity className="w-full bg-primary py-4 rounded-xl items-center justify-center" onPress={() => router.replace('/dealers')}>
                                    <Text className="text-white font-bold text-base">Back to Dealers</Text>
                                </TouchableOpacity>

                                {submissionResult.type === 'draft' && (
                                    <TouchableOpacity className="w-full border border-slate-300 bg-white py-4 rounded-xl items-center justify-center mt-4" onPress={() => setSubmissionResult(null)}>
                                        <Text className="text-slate-700 font-bold text-base">Continue Editing</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#f4f4f7]">
            <View className="px-6 py-4 bg-[#f4f4f7] z-10 flex-row items-center border-b border-[#eaedf2]">
                <TouchableOpacity onPress={handleBack} className="mr-4 p-2 -ml-2" disabled={submitting}>
                    <Text className="text-slate-500 font-bold text-3xl leading-[18px]">‹</Text>
                </TouchableOpacity>
                <View className="flex-1 flex-row items-center gap-3">
                    <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Zeekr_logo.png/800px-Zeekr_logo.png' }} style={{ width: 68, height: 16, resizeMode: 'contain' }} className="mb-[2px]" />
                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Assessment</Text>
                </View>
                <TouchableOpacity onPress={() => saveDraft(false)} disabled={submitting}>
                    <Text className="text-primary font-bold ml-2">Save</Text>
                </TouchableOpacity>
                <View className="bg-slate-100 rounded-full px-2 py-1 ml-2">
                    <Text className="text-slate-500 font-bold text-sm">{progressPercent}%</Text>
                </View>
            </View>

            <View className="h-1 bg-slate-200 w-full relative">
                <View className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
            </View>

            {validationErrors.length > 0 ? (
                <View className="px-5 mt-4 relative">
                    <View className="bg-red-50 border border-red-200 p-4 rounded-xl pr-10">
                        <Text className="text-red-800 text-sm font-bold mb-3 border-b border-red-200 pb-2">Missing Requirements</Text>
                        {validationErrors.map((err, i) => (
                            <TouchableOpacity key={i} onPress={() => {
                                const y = sectionOffsets.current[err.stepIndex];
                                if (y !== undefined) {
                                    scrollViewRef.current?.scrollTo({ y, animated: true });
                                }
                            }} className="mb-2 flex-row items-center">
                                <Text className="text-red-600 font-bold mr-2 text-[10px]">🔗</Text>
                                <Text className="text-red-600 text-[13px] font-medium flex-1 underline tracking-tight">{err.text}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity className="absolute top-4 right-4 p-1" onPress={() => setValidationErrors([])}>
                            <Text className="text-red-400 font-bold text-xl leading-none">✕</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <ScrollView
                    ref={scrollViewRef}
                    className="flex-1 px-5 py-6"
                    contentContainerStyle={{ paddingBottom: 150 }}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    {SURVEY_STEPS.map((step, stepIdx) => {
                        let icon = '📋';
                        let iconColor = 'text-[#5c3cfa]';
                        if (step.id === 'compliance') { icon = '🛡️'; }
                        else if (step.id === 'visibility') { icon = '👁️'; }
                        else if (step.id === 'parking') { icon = '🚗'; }
                        else if (step.id === 'customer') { icon = '👥'; }
                        else if (step.id === 'brand') { icon = '✨'; }
                        else if (step.id === 'facility') { icon = '🏢'; }
                        else if (step.id === 'charging') { icon = '⚡'; }

                        const isActive = activeSectionIndex === stepIdx;

                        const catResponses = responses[step.title] || {};
                        const isCompleted = step.questions.length > 0 && step.questions.every(q => catResponses[q]?.response_value);

                        return (
                            <Animated.View
                                key={stepIdx}
                                className="mb-6 p-7 pb-4 rounded-[32px] bg-white border border-[#eae9f0]"
                                style={{
                                    opacity: isActive ? 1 : 0.6,
                                    transform: [{ scale: isActive ? 1 : 0.98 }],
                                    shadowColor: '#000',
                                    shadowOpacity: isActive ? 0.03 : 0,
                                    shadowRadius: 20,
                                    shadowOffset: { width: 0, height: 8 },
                                    elevation: isActive ? 3 : 0
                                }}
                                onLayout={(e) => sectionOffsets.current[stepIdx] = e.nativeEvent.layout.y}
                            >
                                <View className="flex-row items-center mb-8">
                                    <View className="mr-3">
                                        <Text className={`text-[16px] ${iconColor}`}>{icon}</Text>
                                    </View>
                                    <Text className="text-[13px] font-bold text-[#0f172a] flex-1 tracking-[0.5px] uppercase">{step.title}</Text>
                                    {isCompleted && <Text className="text-emerald-500 font-bold text-[10px] uppercase tracking-wider">✓ Validated</Text>}
                                </View>
                                {step.questions.map((q, idx) => (
                                    <QuestionCard
                                        key={idx}
                                        category={step.title}
                                        question={q}
                                        questionNum={`${stepIdx + 1}.${idx + 1}`}
                                        isLast={idx === step.questions.length - 1}
                                    />
                                ))}
                            </Animated.View>
                        );
                    })}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom Bar Toolbar */}
            <View className="px-5 py-6 bg-white flex-row gap-4 items-center absolute bottom-0 w-full z-20" style={{
                shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 20
            }}>
                <TouchableOpacity
                    className="flex-[0.8] h-[54px] border border-black/10 rounded-xl items-center justify-center bg-slate-50"
                    onPress={handleBack}
                    disabled={submitting}
                >
                    <Text className="text-slate-600 font-bold text-[17px]">Cancel</Text>
                </TouchableOpacity>

                <View className="flex-[1.2]">
                    <MagneticButton
                        title="Submit Audit"
                        onPress={handleSubmit}
                        loading={submitting}
                        disabled={submitting}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}
