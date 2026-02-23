import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { useOfflineStore } from '../../store/offlineStore';

export default function DealersList() {
    const [dealers, setDealers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { queue } = useOfflineStore();

    useFocusEffect(
        useCallback(() => {
            fetchDealers();
        }, [])
    );

    async function fetchDealers() {
        setLoading(true);
        const { data, error } = await supabase.from('dealers').select(`
            *,
            surveys (
                id,
                status,
                overall_score,
                recommendation,
                user_id,
                created_at
            )
        `).order('name');
        if (!error && data) {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id;

            const processed = data.map(dealer => {
                const userSurveys = (dealer.surveys || []).filter((s: any) => s.user_id === userId);
                userSurveys.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                const completed = userSurveys.find((s: any) => s.status === 'Completed');
                const draft = userSurveys.find((s: any) => s.status === 'Draft');

                return {
                    ...dealer,
                    surveyStatus: completed ? 'Completed' : (draft ? 'Draft' : 'None'),
                    surveyProgress: draft ? draft.overall_score : 0,
                    recommendation: completed ? completed.recommendation : null,
                    finalScore: completed ? completed.overall_score : null
                };
            });
            setDealers(processed);
        }
        setLoading(false);
    }

    async function signOut() {
        await supabase.auth.signOut();
    }

    return (
        <SafeAreaView className="flex-1 bg-[#f4f4f7]">
            <View className="px-6 py-4 flex-row justify-between items-center bg-[#f4f4f7] border-b border-[#eaedf2] z-10">
                <View className="flex-col pb-2">
                    <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Zeekr_logo.png/800px-Zeekr_logo.png' }} style={{ width: 80, height: 16, resizeMode: 'contain' }} className="mb-1" />
                    <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Pre-Site Assessment</Text>
                </View>
                <View className="flex-row items-center gap-2">
                    <TouchableOpacity onPress={() => router.push('/admin')} className="bg-slate-100 rounded-lg px-2 py-2 border-slate-200">
                        <Text className="text-slate-600 font-bold text-xs uppercase tracking-wider">⚙️ Config</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/sync')} className="bg-slate-100 rounded-lg px-2 py-2 relative">
                        <Text className="text-slate-600 font-bold text-xs uppercase tracking-wider">Sync Log</Text>
                        {queue.length > 0 && (
                            <View className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border border-white" />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={signOut} className="bg-slate-100 rounded-lg px-3 py-2 border-l border-slate-200">
                        <Text className="text-slate-600 font-bold text-xs uppercase tracking-wider">Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
            {loading ? (
                <ActivityIndicator className="mt-8" size="large" color="#007AFF" />
            ) : (
                <FlatList
                    data={dealers}
                    keyExtractor={(item) => item.id}
                    className="px-4 pt-4"
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            className="bg-white p-6 rounded-[24px] mb-4 shadow-sm border border-[#eaedf2] flex-row items-center justify-between"
                            onPress={() => router.push(`/survey/${item.id}`)}
                            activeOpacity={0.7}
                        >
                            <View className="flex-1 pr-4">
                                <Text className="text-[16px] font-bold text-[#1e1e2d] mb-1">{item.name}</Text>
                                <Text className="text-[#8a94a6] text-[12px] font-medium mb-3">{item.address || 'No address provided'}</Text>
                                {item.surveyStatus === 'Completed' && (
                                    <View className="bg-green-100 self-start px-2 py-1 rounded-md">
                                        <Text className="text-green-800 text-xs font-bold">✓ Completed - {item.finalScore}% ({item.recommendation})</Text>
                                    </View>
                                )}
                                {item.surveyStatus === 'Draft' && (
                                    <View className="bg-amber-100 self-start px-2 py-1 rounded-md">
                                        <Text className="text-amber-800 text-xs font-bold">✎ Draft - {item.surveyProgress}% Complete</Text>
                                    </View>
                                )}
                            </View>
                            <View className="bg-slate-100 w-10 h-10 rounded-full items-center justify-center">
                                <Text className="text-slate-400 font-bold text-lg">›</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View className="mt-10 items-center justify-center">
                            <Text className="text-slate-500 text-lg mb-2 text-center">No dealers found.</Text>
                            <Text className="text-slate-400 text-center mb-6">Create one to get started with a site survey.</Text>
                        </View>
                    }
                />
            )}
            <View className="p-6 bg-white border-t border-[#eaedf2] pb-8 pt-4">
                <TouchableOpacity
                    className="bg-[#5c3cfa] py-4 rounded-[20px] items-center"
                    onPress={() => router.push('/dealers/new')}
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-semibold text-[15px] tracking-wide">+ Create New Dealer</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
