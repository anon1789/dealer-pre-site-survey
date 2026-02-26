import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'nativewind';

const DEFAULT_WEIGHTS = [
    { category: 'Visibility & Accessibility', weight: 20, is_gatekeeper: false },
    { category: 'Parking & Traffic Flow', weight: 20, is_gatekeeper: false },
    { category: 'Customer Journey Potential', weight: 20, is_gatekeeper: false },
    { category: 'Brand Identity Feasibility', weight: 15, is_gatekeeper: false },
    { category: 'Facility & Technical Readiness', weight: 15, is_gatekeeper: false },
    { category: 'Charging & Signage Readiness', weight: 10, is_gatekeeper: false },
    { category: 'Compliance', weight: 0, is_gatekeeper: true },
];

export default function AdminSettings() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [weights, setWeights] = useState<any[]>(DEFAULT_WEIGHTS);
    const { colorScheme, toggleColorScheme } = useColorScheme();

    const checkAndLoadWeights = async () => {
        setLoading(true);
        try {
            const savedWeights = await AsyncStorage.getItem('@survey_weights');
            if (savedWeights) {
                setWeights(JSON.parse(savedWeights));
            } else {
                setWeights(DEFAULT_WEIGHTS);
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    useEffect(() => {
        checkAndLoadWeights();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        let totalWeight = 0;

        weights.forEach(w => {
            if (!w.is_gatekeeper) {
                totalWeight += Number(w.weight);
            }
        });

        if (totalWeight !== 100) {
            Alert.alert("Validation Error", `Total weight must be exactly 100%. Current total is ${totalWeight}%.`);
            setSaving(false);
            return;
        }

        try {
            await AsyncStorage.setItem('@survey_weights', JSON.stringify(weights));
            Alert.alert("Success", "Survey weights have been securely updated!");
        } catch (error) {
            Alert.alert("Save Error", "Failed to save configuration locally.");
        }
    };

    const currentTotal = weights.reduce((sum, w) => {
        return sum + (w.is_gatekeeper ? 0 : Number(w.weight || 0));
    }, 0);

    const isTotalValid = currentTotal === 100;

    return (
        <SafeAreaView className="flex-1 bg-[#f4f4f7] dark:bg-[#0A0A0C]">
            <View className="px-6 py-4 flex-row justify-between items-center bg-[#f4f4f7] dark:bg-[#0A0A0C] border-b border-[#eaedf2] dark:border-[#2B2B36] z-10">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 -ml-2">
                    <Text className="text-slate-500 dark:text-[#9496A1] font-bold text-3xl leading-[18px]">‹</Text>
                </TouchableOpacity>
                <Text className="text-[17px] font-bold text-[#1e1e2d] dark:text-white">Admin Section Options</Text>
            </View>

            {loading ? (
                <ActivityIndicator className="mt-8" size="large" color="#007AFF" />
            ) : (
                <ScrollView className="flex-1 px-5 pt-6 pb-20">
                    <View className="mb-6 bg-white dark:bg-[#16161C] rounded-[24px] border border-[#eaedf2] dark:border-[#2B2B36] overflow-hidden p-5 flex-row items-center justify-between">
                        <View className="flex-1">
                            <Text className="text-[14px] font-bold text-[#1e1e2d] dark:text-white mb-1">Pro Dark Mode</Text>
                            <Text className="text-[#8a94a6] dark:text-[#9496A1] text-[12px] font-medium">Toggle the high-contrast UI theme</Text>
                        </View>
                        <Switch
                            value={colorScheme === 'dark'}
                            onValueChange={toggleColorScheme}
                            trackColor={{ false: '#eaedf2', true: '#5c3cfa' }}
                        />
                    </View>

                    <Text className="text-slate-600 dark:text-[#9496A1] mb-6 font-medium">
                        Adjust the global calculation percentages for your surveys below. Total weight must equal 100%. Gatekeeper categories do not have point values.
                    </Text>

                    <View className="bg-white dark:bg-[#16161C] rounded-[24px] border border-[#eaedf2] dark:border-[#2B2B36] overflow-hidden">
                        <View className="flex-row bg-[#fafafc] dark:bg-[#1A1A20] border-b border-[#f0f0f5] dark:border-[#2B2B36] p-5">
                            <Text className="flex-1 text-[11px] font-bold text-[#8a94a6] dark:text-[#717382] uppercase tracking-[1.5px]">Section</Text>
                            <Text className="w-36 text-[11px] font-bold text-[#8a94a6] dark:text-[#717382] uppercase tracking-[1.5px] text-right">Weight</Text>
                        </View>
                        {weights.map((w, i) => (
                            <View key={i} className={`flex-row items-center p-5 ${i !== weights.length - 1 ? 'border-b border-[#f0f0f5] dark:border-[#2B2B36]' : ''}`}>
                                <View className="flex-1 pr-4">
                                    <Text className="font-semibold text-[14px] text-[#1e1e2d] dark:text-white">{w.category}</Text>
                                </View>

                                <View className="w-36 items-end">
                                    {w.is_gatekeeper ? (
                                        <Text className="text-[#8a94a6] dark:text-[#9496A1] font-medium text-[11px] bg-[#fafafc] dark:bg-[#1A1A20] px-2 py-1.5 rounded-md">Gatekeeper(Non-scored)</Text>
                                    ) : (
                                        <View className="flex-row items-center border border-[#eaedf2] dark:border-[#2B2B36] rounded-[16px] px-3 py-2 bg-[#fafafc] dark:bg-[#1A1A20] min-w-[70px]">
                                            <TextInput
                                                className="font-bold text-[#1e1e2d] dark:text-white text-center flex-1"
                                                keyboardType="numeric"
                                                value={String(w.weight)}
                                                onChangeText={(val) => {
                                                    const newWeights = [...weights];
                                                    newWeights[i].weight = val.replace(/[^0-9]/g, '');
                                                    setWeights(newWeights);
                                                }}
                                            />
                                            <Text className="text-slate-500 dark:text-[#717382] font-bold ml-1">%</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}

                        {/* Total Row */}
                        <View className="flex-row items-center p-5 bg-[#fafafc] dark:bg-[#13131A] border-t border-[#eaedf2] dark:border-[#2B2B36]">
                            <View className="flex-1 pr-4">
                                <Text className="font-bold text-[12px] text-[#1e1e2d] dark:text-white uppercase tracking-wide">Total Combined Weighting</Text>
                            </View>
                            <View className="w-36 items-end">
                                <Text className={`font-black text-lg ${isTotalValid ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {currentTotal}%
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View className="h-20" />
                </ScrollView>
            )}

            {!loading && (
                <View className="p-6 bg-white dark:bg-[#0A0A0C] border-t border-[#eaedf2] dark:border-[#2B2B36] pb-8 pt-4">
                    <TouchableOpacity
                        className={`py-4 rounded-[16px] items-center ${saving ? 'bg-slate-300 dark:bg-slate-700' : 'bg-[#5c3cfa] dark:bg-[#7E60FA]'}`}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold text-[15px] tracking-wide">Save Configuration</Text>}
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}
