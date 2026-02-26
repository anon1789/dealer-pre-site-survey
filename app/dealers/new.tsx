import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewDealer() {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [salesforceId, setSalesforceId] = useState('');
    const [loading, setLoading] = useState(false);

    // Address lookup state
    const [searchQuery, setSearchQuery] = useState('');
    const [addressOptions, setAddressOptions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [coordinates, setCoordinates] = useState<{ lat: string, lon: string } | null>(null);

    const router = useRouter();

    const searchAddress = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setAddressOptions([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
            const data = await response.json();
            setAddressOptions(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectAddress = (selectedAddr: any) => {
        setAddress(selectedAddr.display_name);
        setSearchQuery(selectedAddr.display_name);
        if (selectedAddr.lat && selectedAddr.lon) {
            setCoordinates({ lat: selectedAddr.lat, lon: selectedAddr.lon });
        }
        setAddressOptions([]); // hide dropdown
    };

    async function createDealer() {
        if (!name) return Alert.alert('Validation Check', 'Dealer Name is required.');
        setLoading(true);
        const { data, error } = await supabase.from('dealers').insert([
            { name, address, external_salesforce_id: salesforceId }
        ]).select().single();

        setLoading(false);
        if (error) {
            Alert.alert('Error Data Creation', error.message);
        } else {
            router.replace('/dealers');
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-[#f4f4f7]">
            <View className="px-6 py-4 flex-row items-center bg-[#f4f4f7] border-b border-[#eaedf2] z-10">
                <TouchableOpacity onPress={() => router.replace('/dealers')} className="mr-4 p-2 -ml-2">
                    <Text className="text-slate-500 font-bold text-3xl leading-[18px]">‹</Text>
                </TouchableOpacity>
                <View className="flex-col pb-1">
                    <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Zeekr_logo.png/800px-Zeekr_logo.png' }} style={{ width: 68, height: 16, resizeMode: 'contain' }} className="mb-1" />
                    <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">New Dealer</Text>
                </View>
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView className="flex-1 p-6" keyboardShouldPersistTaps="handled">
                    <View className="bg-white p-7 rounded-[32px] border border-[#eaedf2] space-y-6">
                        <View>
                            <Text className="text-[11px] font-bold text-[#8a94a6] uppercase tracking-[1.5px] ml-1 mb-2">Company Name *</Text>
                            <TextInput
                                className="w-full bg-[#fafafc] border border-[#eaedf2] rounded-[20px] px-5 h-[52px] text-[#1e1e2d] font-medium"
                                onChangeText={setName}
                                value={name}
                                placeholder="e.g. Acme Motors"
                                placeholderTextColor="#94a3b8"
                            />
                        </View>
                        <View className="mt-4 relative z-50">
                            <Text className="text-[11px] font-bold text-[#8a94a6] uppercase tracking-[1.5px] ml-1 mb-2">Lookup Valid Address</Text>
                            <TextInput
                                className="w-full bg-[#fafafc] border border-[#eaedf2] rounded-[20px] px-5 h-[52px] text-[#1e1e2d] font-medium"
                                onChangeText={searchAddress}
                                value={searchQuery}
                                placeholder="Start typing to search globally..."
                                placeholderTextColor="#94a3b8"
                            />

                            {isSearching && (
                                <View className="mt-2 flex-row items-center pl-2">
                                    <ActivityIndicator size="small" color="#635BFF" />
                                    <Text className="text-slate-500 ml-2 text-xs">Searching...</Text>
                                </View>
                            )}

                            {addressOptions.length > 0 && (
                                <View className="bg-white border border-slate-200 rounded-xl mt-2 overflow-hidden shadow-lg absolute top-[85px] w-full z-50">
                                    {addressOptions.map((opt, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            className={`p-4 border-b border-slate-100 ${idx === addressOptions.length - 1 ? 'border-b-0' : ''}`}
                                            onPress={() => handleSelectAddress(opt)}
                                        >
                                            <Text className="text-slate-700 text-sm font-medium">{opt.display_name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {address !== '' && (
                                <View className={`mt-4 overflow-hidden rounded-xl border border-green-200 ${coordinates ? 'bg-white shadow-sm' : 'bg-green-50'}`}>
                                    <View className="p-4 bg-green-50 z-10 pb-5">
                                        <Text className="text-green-800 text-xs font-bold uppercase mb-1">✓ Validated Address</Text>
                                        <Text className="text-green-900 font-medium">{address}</Text>
                                    </View>
                                    {coordinates && (
                                        <Image
                                            source={{ uri: `https://static-maps.yandex.ru/1.x/?lang=en-US&ll=${coordinates.lon},${coordinates.lat}&z=14&l=map&pt=${coordinates.lon},${coordinates.lat},pm2rdm` }}
                                            style={{ width: '100%', height: 180 }}
                                            className="border-t border-slate-200"
                                        />
                                    )}
                                </View>
                            )}
                        </View>
                        <View className="mt-4">
                            <Text className="text-[11px] font-bold text-[#8a94a6] uppercase tracking-[1.5px] ml-1 mb-2">Salesforce ID (Optional)</Text>
                            <TextInput
                                className="w-full bg-[#fafafc] border border-[#eaedf2] rounded-[20px] px-5 h-[52px] text-[#1e1e2d] font-medium"
                                onChangeText={setSalesforceId}
                                value={salesforceId}
                                autoCapitalize={'none'}
                                placeholder="001xyz..."
                                placeholderTextColor="#94a3b8"
                            />
                        </View>
                    </View>
                </ScrollView>
                <View className="p-6 bg-white border-t border-[#eaedf2] pb-8 pt-4">
                    <TouchableOpacity
                        className={`py-4 rounded-[20px] items-center ${loading ? 'bg-slate-300' : 'bg-[#5c3cfa]'}`}
                        disabled={loading}
                        onPress={createDealer}
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-semibold text-[15px] tracking-wide">{loading ? 'Saving...' : 'Save Dealer'}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
