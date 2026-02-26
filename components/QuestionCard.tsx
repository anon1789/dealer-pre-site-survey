import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native';
import { useState } from 'react';
import { useSurveyStore, ResponseValue } from '../store/surveyStore';
import * as ImagePicker from 'expo-image-picker';

export default function QuestionCard({ category, question, questionNum, isLast }: { category: string, question: string, questionNum?: string, isLast?: boolean }) {
    const { responses, setResponse } = useSurveyStore();
    const [inputHeight, setInputHeight] = useState(20);

    const response = responses[category]?.[question];
    const responseValue = response?.response_value;
    const comments = response?.comments || '';
    const photoUri = response?.photo_uri;

    const handlePickImage = async () => {
        let pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.5,
        });
        if (!pickerResult.canceled) {
            setResponse(category, question, { photo_uri: pickerResult.assets[0].uri });
        }
    };

    const handleSelect = (val: ResponseValue) => {
        setResponse(category, question, { response_value: val });
    };

    const OptionButton = ({ label, val }: { label: string, val: ResponseValue }) => {
        const isSelected = responseValue === val;
        return (
            <TouchableOpacity
                className={`flex-1 mx-1 rounded-[16px] items-center justify-center ${isSelected ? 'bg-[#5c3cfa] border-2 border-white/20' : 'bg-white/5'}`}
                style={{ height: 48 }}
                onPress={() => handleSelect(val)}
                activeOpacity={0.7}
            >
                <Text className={`font-semibold text-[14px] ${isSelected ? 'text-white' : 'text-white/80'}`}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View className="mb-4 bg-white/5 border border-white/10 rounded-[24px] p-5">
            <View className="mb-5">
                <Text className="text-[15px] font-medium text-white mb-4 pr-2">
                    {questionNum ? `${questionNum}. ` : ''}{question}
                </Text>

                <View className="flex-row justify-between -mx-1">
                    <OptionButton label="Yes" val="Yes" />
                    <OptionButton label="Partial" val="Partially" />
                    <OptionButton label="No" val="No" />
                    <OptionButton label="N/A" val="N/A" />
                </View>
            </View>

            <View className="mb-5">
                <Text className="text-[11px] font-bold text-white/50 uppercase tracking-[1.5px] ml-1 mb-2">
                    Media Evidence
                </Text>
                <TouchableOpacity
                    className="border border-dashed border-white/20 rounded-[16px] h-[80px] items-center justify-center bg-white/5 flex-row overflow-hidden"
                    activeOpacity={0.7}
                    onPress={handlePickImage}
                >
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                        <Text className="text-white/50 font-medium text-[13px]">Tap to capture photo</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View>
                <Text className="text-[11px] font-bold text-white/50 uppercase tracking-[1.5px] ml-1 mb-2">
                    Additional Comments
                </Text>
                <View className="border border-white/10 rounded-[20px] bg-white/5 px-4 min-h-[52px] py-3">
                    <TextInput
                        value={comments}
                        onChangeText={(text) => setResponse(category, question, { comments: text })}
                        placeholder="Type here..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        multiline
                        scrollEnabled={false}
                        onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                        className="text-[15px] text-white font-medium leading-[20px]"
                        style={{ paddingTop: 0, paddingBottom: 0, textAlignVertical: 'top', height: Math.max(20, inputHeight) }}
                    />
                </View>
            </View>
        </View>
    );
}
