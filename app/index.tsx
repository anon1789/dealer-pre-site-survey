import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';
import { Session } from '@supabase/supabase-js';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                router.replace('/login');
            } else {
                router.replace('/dealers');
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) router.replace('/login');
            else router.replace('/dealers');
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <View className="flex-1 justify-center items-center bg-slate-50">
            <ActivityIndicator size="large" color="#007AFF" />
        </View>
    );
}
