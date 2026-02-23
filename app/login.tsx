import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';
import { useRouter } from 'expo-router';
import MagneticButton from '../components/MagneticButton';
import { TextInput as RNTextInput } from 'react-native';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const router = useRouter();

    async function signInWithEmail() {
        setErrorMessage('');
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setErrorMessage(error.message);
            Alert.alert('Sign In Failed', error.message);
        } else {
            router.replace('/');
        }
        setLoading(false);
    }

    async function signUpWithEmail() {
        setErrorMessage('');
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setErrorMessage(error.message);
            Alert.alert('Sign Up Failed', error.message);
        } else {
            Alert.alert('Success', 'Check your email for the login link!');
            setErrorMessage('Check your email for the login link!');
        }
        setLoading(false);
    }

    return (
        <View className="flex-1 bg-slate-900">
            {/* Top Brand Header area */}
            <SafeAreaView className="flex-1 items-center justify-center pt-8 pb-10">
                <Image
                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Zeekr_logo.png/800px-Zeekr_logo.png' }}
                    style={{ width: 140, height: 40, resizeMode: 'contain', tintColor: '#ffffff' }}
                    className="mb-4"
                />
                <Text className="text-xl font-bold text-white text-center uppercase tracking-widest">Dealer Pre-Site Assessment</Text>
            </SafeAreaView>

            {/* Bottom Form Modal - Bento Tile */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="bg-[#f4f4f7] rounded-t-[40px] px-6 pt-10 pb-12 flex-[2.5]"
            >
                <View className="flex-row items-center justify-between mb-8 relative">
                    <TouchableOpacity className="absolute left-0 z-10 w-10">
                        <Text className="text-slate-400 font-bold text-2xl leading-none">✕</Text>
                    </TouchableOpacity>
                    <Text className="w-full text-center font-bold text-[17px] text-slate-800">Continue with Email</Text>
                </View>

                {/* Box layout for error space reservation (no layout shift) */}
                <View className="h-10 justify-end mb-4">
                    {errorMessage ? (
                        <Text className="text-rose-500 font-semibold text-sm text-center tracking-wide">{errorMessage}</Text>
                    ) : null}
                </View>

                <View className="flex-col gap-6 mb-2">
                    {/* Email Input */}
                    <View>
                        <Text className="text-[11px] font-bold text-[#8a94a6] uppercase tracking-[1.5px] ml-1 mb-2">Email Address</Text>
                        <RNTextInput
                            className={`w-full bg-white border ${errorMessage ? 'border-rose-300' : 'border-[#eaedf2]'} rounded-[20px] px-5 h-[56px] text-[#1e1e2d] font-medium text-[15px]`}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="your.name@zeekr.com"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    {/* Password Input */}
                    <View>
                        <Text className="text-[11px] font-bold text-[#8a94a6] uppercase tracking-[1.5px] ml-1 mb-2">Password</Text>
                        <RNTextInput
                            className={`w-full bg-white border ${errorMessage ? 'border-rose-300' : 'border-[#eaedf2]'} rounded-[20px] px-5 h-[56px] text-[#1e1e2d] font-medium text-[15px]`}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="none"
                            secureTextEntry={true}
                        />
                    </View>
                </View>

                <TouchableOpacity className="self-end mb-8 mt-4">
                    <Text className="text-[#8a94a6] font-semibold text-[13px]">Forgot password?</Text>
                </TouchableOpacity>

                <View className="flex-1" />

                <View className="items-center mb-6">
                    <Text className="text-slate-600 font-medium text-[15px]">
                        New to ZEEKR?{' '}
                        <Text className="text-primary font-bold" onPress={() => Alert.alert('Request Account', 'Please contact your administrator to request an account.')}>Request account</Text>
                    </Text>
                </View>

                <MagneticButton
                    title="Sign In"
                    onPress={signInWithEmail}
                    loading={loading}
                />
            </KeyboardAvoidingView>
        </View>
    );
}
