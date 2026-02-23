import React, { useRef, useState } from 'react';
import { Text, Pressable, Platform, DimensionValue } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolateColor
} from 'react-native-reanimated';

const springConfig = { mass: 1, stiffness: 100, damping: 15 };

interface MagneticButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    width?: DimensionValue;
}

export default function MagneticButton({ title, onPress, disabled, loading, width = '100%' }: MagneticButtonProps) {
    const xParams = useSharedValue(0);
    const yParams = useSharedValue(0);
    const scale = useSharedValue(1);

    const handlePointerMove = (e: any) => {
        if (Platform.OS === 'web') {
            const { offsetX, offsetY, target } = e.nativeEvent;
            const rect = target.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            const x = (offsetX - width / 2) * 0.3; // subtle 30% pull
            const y = (offsetY - height / 2) * 0.3;

            xParams.value = withSpring(x, springConfig);
            yParams.value = withSpring(y, springConfig);
        }
    };

    const handlePointerLeave = () => {
        xParams.value = withSpring(0, springConfig);
        yParams.value = withSpring(0, springConfig);
        scale.value = withSpring(1, springConfig);
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: xParams.value },
                { translateY: yParams.value },
                { scale: scale.value }
            ],
        };
    });

    return (
        <Animated.View style={[animatedStyle, { width, marginBottom: 8 }]}>
            <Pressable
                onPress={onPress}
                disabled={disabled || loading}
                onPressIn={() => scale.value = withSpring(0.95, springConfig)}
                onPressOut={() => scale.value = withSpring(1, springConfig)}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                style={{
                    backgroundColor: disabled ? '#94a3b8' : '#635BFF', // primary
                    height: 54,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#635BFF',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.25,
                    shadowRadius: 16,
                    elevation: 5,
                }}
            >
                {loading ? (
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Loading...</Text>
                ) : (
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 17, letterSpacing: 0.5 }}>{title}</Text>
                )}
            </Pressable>
        </Animated.View>
    );
}
