import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, SectionList, TouchableOpacity, ActivityIndicator, Image, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOfflineStore } from '../../store/offlineStore';

export default function DealersList() {
    const [dealers, setDealers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
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
                const country = dealer.address ? (dealer.address.split(',').pop()?.trim() || 'Unknown') : 'Unknown';

                return {
                    ...dealer,
                    country,
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

    const sections = useMemo(() => {
        const filtered = dealers.filter(d =>
            (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.address || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        const grouped = filtered.reduce((acc, dealer) => {
            const country = dealer.country || 'Unknown';
            if (!acc[country]) acc[country] = [];
            acc[country].push(dealer);
            return acc;
        }, {} as Record<string, any[]>);

        return Object.keys(grouped).sort().map(country => ({
            title: country,
            data: grouped[country]
        }));
    }, [dealers, searchQuery]);

    return (
        <SafeAreaView className="flex-1 bg-[#f4f4f7] dark:bg-[#0A0A0C]">
            <View className="px-6 py-4 flex-row justify-between items-center bg-[#f4f4f7] dark:bg-[#0A0A0C] border-b border-[#eaedf2] dark:border-[#2B2B36] z-10">
                <View className="flex-col pb-2">
                    <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Zeekr_logo.png/800px-Zeekr_logo.png' }} style={{ width: 80, height: 16, resizeMode: 'contain' }} className="mb-1 dark:tint-white" />
                    <Text className="text-sm font-bold text-slate-400 dark:text-[#717382] uppercase tracking-widest leading-none">Pre-Site Assessment</Text>
                </View>
                <View className="flex-row items-center gap-2">
                    <TouchableOpacity onPress={() => router.push('/admin')} className="bg-slate-100 dark:bg-[#1A1A20] rounded-lg px-2 py-2 border border-transparent dark:border-[#2B2B36]">
                        <Text className="text-slate-600 dark:text-[#9496A1] font-bold text-xs uppercase tracking-wider">⚙️ Config</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/sync')} className="bg-slate-100 dark:bg-[#1A1A20] rounded-lg px-2 py-2 relative border border-transparent dark:border-[#2B2B36]">
                        <Text className="text-slate-600 dark:text-[#9496A1] font-bold text-xs uppercase tracking-wider">Sync Log</Text>
                        {queue.length > 0 && (
                            <View className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border border-white dark:border-[#1A1A20]" />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={signOut} className="bg-slate-100 dark:bg-[#1A1A20] rounded-lg px-3 py-2 border-l border-slate-200 dark:border-[#2B2B36]/0">
                        <Text className="text-slate-600 dark:text-[#9496A1] font-bold text-xs uppercase tracking-wider">Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View className="px-4 py-4 z-10">
                <TextInput
                    placeholder="Search dealers by name or location..."
                    placeholderTextColor="#8a94a6"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="bg-white dark:bg-[#1A1A20] border border-[#eaedf2] dark:border-[#2B2B36] rounded-[20px] px-5 h-[48px] text-[#1e1e2d] dark:text-white font-medium text-[14px]"
                />
            </View>
            {loading ? (
                <ActivityIndicator className="mt-8" size="large" color="#007AFF" />
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id}
                    className="px-4"
                    renderSectionHeader={({ section: { title } }) => (
                        <View className="py-2 px-1 mb-2 mt-2 border-b border-[#eaedf2] dark:border-[#2B2B36]">
                            <Text className="text-[11px] font-bold text-[#8a94a6] dark:text-[#9496A1] uppercase tracking-[1.5px]">{title}</Text>
                        </View>
                    )}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            className="bg-white dark:bg-[#16161C] p-6 rounded-[24px] mb-4 shadow-sm border border-[#eaedf2] dark:border-[#2B2B36] flex-row items-center justify-between"
                            onPress={() => router.push(`/survey/${item.id}`)}
                            activeOpacity={0.7}
                        >
                            <View className="flex-1 pr-4">
                                <Text className="text-[16px] font-bold text-[#1e1e2d] dark:text-white mb-1">{item.name}</Text>
                                <Text className="text-[#8a94a6] dark:text-[#9496A1] text-[12px] font-medium mb-3">{item.address || 'No address provided'}</Text>
                                {item.surveyStatus === 'Completed' && (
                                    <View className="bg-green-100 dark:bg-[#132D1B] dark:border dark:border-[#22C55E40] self-start px-2 py-1 rounded-md">
                                        <Text className="text-green-800 dark:text-[#4ADE80] text-xs font-bold">✓ Completed - {item.finalScore}% ({item.recommendation})</Text>
                                    </View>
                                )}
                                {item.surveyStatus === 'Draft' && (
                                    <View className="bg-amber-100 dark:bg-amber-900/30 dark:border dark:border-amber-500/20 self-start px-2 py-1 rounded-md">
                                        <Text className="text-amber-800 dark:text-amber-400 text-xs font-bold">✎ Draft - {item.surveyProgress}% Complete</Text>
                                    </View>
                                )}
                            </View>
                            <View className="bg-slate-100 dark:bg-[#0A0A0C] border border-transparent dark:border-[#2B2B36] w-10 h-10 rounded-full items-center justify-center">
                                <Text className="text-slate-400 dark:text-[#717382] font-bold text-lg">›</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View className="mt-10 items-center justify-center">
                            <Text className="text-slate-500 dark:text-[#9496A1] text-lg mb-2 text-center">No dealers found.</Text>
                            <Text className="text-slate-400 dark:text-[#717382] text-center mb-6">Try a different search or create a new one.</Text>
                        </View>
                    }
                />
            )}
            <View className="p-6 bg-white dark:bg-[#0A0A0C] border-t border-[#eaedf2] dark:border-[#2B2B36] pb-8 pt-4">
                <TouchableOpacity
                    className="bg-[#5c3cfa] dark:bg-[#7E60FA] py-4 rounded-[16px] items-center"
                    onPress={() => router.push('/dealers/new')}
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-semibold flex flex-row items-center justify-center text-[16px] tracking-wide">+ Create New Dealer</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
