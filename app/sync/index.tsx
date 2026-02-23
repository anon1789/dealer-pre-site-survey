import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOfflineStore, OfflineRecord } from '../../store/offlineStore';
import * as Network from 'expo-network';

export default function SyncAndHistory() {
    const router = useRouter();
    const { queue, removeRecord } = useOfflineStore();
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    async function fetchHistory() {
        setLoadingHistory(true);
        const networkState = await Network.getNetworkStateAsync();
        if (!networkState.isConnected) {
            setLoadingHistory(false);
            return;
        }

        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
            setLoadingHistory(false);
            return;
        }

        const { data, error } = await supabase
            .from('surveys')
            .select(`
                id,
                status,
                overall_score,
                recommendation,
                created_at,
                dealers (name)
            `)
            .eq('user_id', userData.user.id)
            .eq('status', 'Completed')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setHistory(data);
        }
        setLoadingHistory(false);
    }

    async function syncQueue() {
        if (queue.length === 0) return;

        const networkState = await Network.getNetworkStateAsync();
        if (!networkState.isConnected) {
            Alert.alert("Offline", "You are still offline. Please connect to the internet to sync.");
            return;
        }

        setSyncing(true);
        const { data: userData } = await supabase.auth.getUser();

        if (!userData?.user) {
            Alert.alert("Error", "Authentication required to sync.");
            setSyncing(false);
            return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const record of queue) {
            try {
                // Check existing draft
                const { data: existingDrafts } = await supabase.from('surveys')
                    .select('id')
                    .eq('dealer_id', record.dealer_id)
                    .eq('user_id', userData.user.id)
                    .eq('status', 'Draft')
                    .order('created_at', { ascending: false })
                    .limit(1);

                let surveyIdToUse = existingDrafts?.[0]?.id;
                const finalStatus = record.type === 'submit' ? 'Completed' : 'Draft';

                if (surveyIdToUse) {
                    await supabase.from('surveys').update({
                        status: finalStatus,
                        overall_score: record.overall_score,
                        recommendation: record.recommendation
                    }).eq('id', surveyIdToUse);
                    await supabase.from('survey_responses').delete().eq('survey_id', surveyIdToUse);
                } else {
                    const { data: newSurvey } = await supabase.from('surveys').insert({
                        dealer_id: record.dealer_id,
                        user_id: userData.user.id,
                        status: finalStatus,
                        overall_score: record.overall_score,
                        recommendation: record.recommendation
                    }).select().single();
                    surveyIdToUse = newSurvey?.id;
                }

                if (surveyIdToUse) {
                    const responseInserts: any[] = [];
                    Object.entries(record.responses).forEach(([category, qs]) => {
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

                    removeRecord(record.id);
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                failCount++;
                console.error("Sync error:", err);
            }
        }

        setSyncing(false);
        Alert.alert("Sync Complete", `Successfully synced ${successCount} records. ${failCount > 0 ? `Failed: ${failCount}` : ''}`);
        fetchHistory(); // refresh history if any submits were synced
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <View className="px-6 py-4 flex-row items-center bg-white border-b border-slate-200 shadow-sm z-10">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 -ml-2">
                    <Text className="text-slate-500 font-bold text-3xl leading-[18px]">‹</Text>
                </TouchableOpacity>
                <Text className="text-xl font-bold text-slate-800">Sync & History</Text>
            </View>

            <ScrollView className="flex-1 p-6">
                <View className="mb-8">
                    <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Offline Queue</Text>
                    {queue.length === 0 ? (
                        <View className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 items-center">
                            <Text className="text-slate-400 font-medium">No offline records to sync.</Text>
                        </View>
                    ) : (
                        <View className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-slate-100">
                                <Text className="text-slate-700 font-bold">{queue.length} Pending Upload(s)</Text>
                                <TouchableOpacity
                                    className={`px-4 py-2 rounded-lg items-center justify-center ${syncing ? 'bg-slate-300' : 'bg-primary'}`}
                                    onPress={syncQueue}
                                    disabled={syncing}
                                >
                                    {syncing ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-bold text-xs uppercase tracking-wider">Sync All</Text>}
                                </TouchableOpacity>
                            </View>

                            {queue.map((record, idx) => (
                                <View key={record.id} className={`py-3 ${idx < queue.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                    <View className="flex-row justify-between items-start mb-1">
                                        <Text className="font-bold text-slate-800">Dealer ID: {record.dealer_id.slice(0, 8)}...</Text>
                                        <View className={`px-2 py-1 rounded-md ${record.type === 'submit' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                            <Text className={`text-[10px] font-bold uppercase ${record.type === 'submit' ? 'text-amber-800' : 'text-slate-500'}`}>
                                                {record.type === 'submit' ? 'Pending Submit' : 'Pending Draft'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="text-xs text-slate-500">Score: {record.overall_score}% • {new Date(record.timestamp).toLocaleString()}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View className="mb-8">
                    <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Historical Surveys</Text>
                    {loadingHistory ? (
                        <ActivityIndicator className="mt-4" size="small" color="#635BFF" />
                    ) : history.length === 0 ? (
                        <View className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 items-center">
                            <Text className="text-slate-400 font-medium">No completed surveys found.</Text>
                        </View>
                    ) : (
                        history.map((item, idx) => (
                            <View key={item.id} className="bg-white p-5 rounded-2xl mb-4 shadow-sm border border-slate-100">
                                <View className="flex-row justify-between items-start mb-2">
                                    <Text className="font-bold text-lg text-slate-800 flex-1">{item.dealers?.name || 'Unknown Dealer'}</Text>
                                    <View className="bg-green-100 px-2 py-1 rounded-md ml-2">
                                        <Text className="text-green-800 text-[10px] font-bold uppercase">Completed</Text>
                                    </View>
                                </View>
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-sm text-slate-600 font-medium">Score: <Text className="font-bold">{item.overall_score}%</Text></Text>
                                    <Text className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</Text>
                                </View>
                                <Text className="text-xs text-slate-500 mt-1 pb-1">Recommendation: {item.recommendation}</Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
