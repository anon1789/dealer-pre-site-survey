import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, TextInputProps, StyleProp, ViewStyle, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    interpolateColor
} from 'react-native-reanimated';

const springConfig = { mass: 1, stiffness: 100, damping: 15 };

interface AnimatedInputProps extends TextInputProps {
    label: string;
    hasError?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
}

export default function AnimatedInput({ label, hasError, containerStyle, onFocus, onBlur, ...props }: AnimatedInputProps) {
    const [isFocused, setIsFocused] = useState(false);

    // Animation Values
    const focusAnim = useSharedValue(props.value ? 1 : 0);
    const shakeAnim = useSharedValue(0);

    useEffect(() => {
        if (hasError) {
            shakeAnim.value = withSequence(
                withSpring(-2, springConfig),
                withSpring(2, springConfig),
                withSpring(-2, springConfig),
                withSpring(0, springConfig)
            );
        }
    }, [hasError]);

    const handleFocus = (e: any) => {
        setIsFocused(true);
        focusAnim.value = withSpring(1, springConfig);
        if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        if (!props.value) {
            focusAnim.value = withSpring(0, springConfig);
        }
        if (onBlur) onBlur(e);
    };

    // Style for the container background/border/glow
    const containerAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: shakeAnim.value }],
            backgroundColor: isFocused || props.value ? '#ffffff' : 'rgba(0,0,0,0.03)',
            // 2px border simulation with box shadow approach for inner focus effect
            shadowColor: isFocused ? '#6366f1' : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isFocused ? 0.2 : 0,
            shadowRadius: isFocused ? 10 : 0,
            elevation: isFocused ? 5 : 0,
            borderColor: isFocused ? '#6366f1' : 'rgba(0,0,0,0.05)',
            borderWidth: isFocused ? 2 : 1,
        };
    });

    const labelAnimatedStyle = useAnimatedStyle(() => {
        const top = focusAnim.value === 1 ? -10 : 16;
        const color = isFocused ? '#635BFF' : '#9ca3af';
        return {
            position: 'absolute',
            left: 14,
            top: top,
            color: color,
            backgroundColor: focusAnim.value === 1 ? (isFocused ? '#ffffff' : 'transparent') : 'transparent',
            paddingHorizontal: focusAnim.value === 1 ? 4 : 0,
            zIndex: 10,
        };
    });

    return (
        <Animated.View style={[
            {
                height: 54,
                borderRadius: 12,
                marginVertical: 12,
                justifyContent: 'center',
            },
            containerAnimatedStyle,
            containerStyle
        ]}>
            <Animated.Text style={[
                {
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase'
                },
                labelAnimatedStyle
            ]}>
                {label}
            </Animated.Text>

            <TextInput
                {...props}
                placeholder={isFocused ? props.placeholder : ""}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={[
                    {
                        flex: 1,
                        paddingHorizontal: 16,
                        paddingTop: focusAnim.value === 1 ? 8 : 0,
                        fontSize: 16,
                        color: '#1e293b',
                        fontWeight: '500',
                        height: 54,
                    },
                    props.style
                ]}
            />
        </Animated.View>
    );
}
