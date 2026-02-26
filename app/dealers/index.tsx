import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, SectionList, TouchableOpacity, ActivityIndicator, Image, TextInput, Platform, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOfflineStore } from '../../store/offlineStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
        <LinearGradient colors={['#1e1e2d', '#2a2a45']} className="flex-1">
            <SafeAreaView className="flex-1">
                <View className="px-6 py-4 flex-row justify-between items-center border-b border-white/10 z-10">
                    <View className="flex-col pb-2">
                        <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Zeekr_logo.png/800px-Zeekr_logo.png' }} style={{ width: 80, height: 16, resizeMode: 'contain', tintColor: 'white' }} className="mb-1" />
                        <Text className="text-sm font-bold text-white/50 uppercase tracking-widest leading-none">Pre-Site Assessment</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity onPress={() => router.push('/admin')} className="bg-white/10 rounded-lg px-2 py-2 border-white/5">
                            <Text className="text-white/80 font-bold text-xs uppercase tracking-wider">⚙️ Config</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/sync')} className="bg-white/10 rounded-lg px-2 py-2 relative">
                            <Text className="text-white/80 font-bold text-xs uppercase tracking-wider">Sync Log</Text>
                            {queue.length > 0 && (
                                <View className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border border-[#1e1e2d]" />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={signOut} className="bg-white/10 rounded-lg px-3 py-2 border-l border-white/10">
                            <Text className="text-white/80 font-bold text-xs uppercase tracking-wider">Out</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View className="px-4 py-4 z-10">
                    <TextInput
                        placeholder="Search dealers by name or location..."
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="bg-white/5 border border-white/20 rounded-[16px] px-5 h-[52px] text-white font-medium text-[14px]"
                    />
                </View>
                {loading ? (
                    <ActivityIndicator className="mt-8" size="large" color="#007AFF" />
                ) : (
                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        renderSectionHeader={({ section: { title } }) => (
                            <View className="py-2 px-1 mb-2 mt-2 border-b border-white/10">
                                <Text className="text-[11px] font-bold text-white/50 uppercase tracking-[1.5px]">{title}</Text>
                            </View>
                        )}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="p-5 rounded-[24px] mb-4 border border-white/20 flex-row items-center justify-between overflow-hidden"
                                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                                onPress={() => router.push(`/survey/${item.id}`)}
                                activeOpacity={0.7}
                            >
                                <View className="flex-1 pr-4 z-10">
                                    <Text className="text-[17px] font-bold text-white mb-1">{item.name}</Text>
                                    <Text className="text-white/60 text-[13px] font-semibold mb-3">{item.address || 'No address provided'}</Text>
                                    {item.surveyStatus === 'Completed' && (
                                        <View className="bg-[#22c55e1A] self-start px-3 py-1.5 rounded-[8px] border border-[#22c55e40]">
                                            <Text className="text-[#4ade80] text-[11px] font-bold uppercase tracking-wide">✓ Completed - {item.finalScore}% ({item.recommendation})</Text>
                                        </View>
                                    )}
                                    {item.surveyStatus === 'Draft' && (
                                        <View className="bg-[#f59e0b1A] self-start px-3 py-1.5 rounded-[8px] border border-[#f59e0b40]">
                                            <Text className="text-[#fbbf24] text-[11px] font-bold uppercase tracking-wide">✎ Draft - {item.surveyProgress}% Complete</Text>
                                        </View>
                                    )}
                                </View>
                                <View className="z-10 bg-white/10 w-10 h-10 rounded-full items-center justify-center">
                                    <Text className="text-white font-bold text-lg">›</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View className="mt-10 items-center justify-center">
                                <Text className="text-white/60 text-lg mb-2 text-center font-bold">No dealers found.</Text>
                                <Text className="text-white/40 text-center mb-6">Try a different search or create a new one.</Text>
                            </View>
                        }
                    />
                )}
                <View className="absolute bottom-0 w-full z-20 overflow-hidden" style={{
                    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20
                }}>
                    <BlurView intensity={50} tint="dark" className="absolute top-0 bottom-0 left-0 right-0" />
                    <View className="absolute top-0 bottom-0 left-0 right-0 bg-[#1e1e2d]/60 border-t border-white/10" />
                    <View className="p-6 pb-8 pt-4">
                        <TouchableOpacity
                            className="bg-[#5c3cfa] py-4 rounded-[20px] items-center border-2 border-white/10 relative z-10"
                            onPress={() => router.push('/dealers/new')}
                            activeOpacity={0.8}
                        >
                            <Text className="text-white font-bold text-[15px] tracking-wide">+ Create New Dealer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}
