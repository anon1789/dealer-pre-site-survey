import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native';
import { useSurveyStore, ResponseValue } from '../store/surveyStore';
import * as ImagePicker from 'expo-image-picker';

export default function QuestionCard({ category, question, questionNum, isLast }: { category: string, question: string, questionNum?: string, isLast?: boolean }) {
    const { responses, setResponse } = useSurveyStore();

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
                className={`flex-1 mx-1 rounded-[20px] items-center justify-center border ${isSelected ? 'bg-[#5c3cfa] border-[#5c3cfa]' : 'bg-white border-[#eaedf2]'}`}
                style={{ height: 52 }}
                onPress={() => handleSelect(val)}
                activeOpacity={0.7}
            >
                <Text className={`font-semibold text-[13px] ${isSelected ? 'text-white' : 'text-[#8a94a6]'}`}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View className="mb-4 bg-[#fafafc] border border-[#eaedf2] rounded-[24px] p-5 shadow-sm shadow-black/5">
            <View className="mb-5">
                <Text className="text-[11px] font-bold text-[#8a94a6] uppercase tracking-[1.5px] ml-1 mb-2">
                    {questionNum ? `${questionNum} ` : ''}{question}
                </Text>

                <View className="flex-row justify-between -mx-1">
                    <OptionButton label="Yes" val="Yes" />
                    <OptionButton label="Partial" val="Partially" />
                    <OptionButton label="No" val="No" />
                    <OptionButton label="N/A" val="N/A" />
                </View>
            </View>

            <View className="mb-5">
                <Text className="text-[11px] font-bold text-[#8a94a6] uppercase tracking-[1.5px] ml-1 mb-2">
                    Media Evidence
                </Text>
                <TouchableOpacity
                    className="border border-dashed border-[#d0d0d8] rounded-[20px] h-[52px] items-center justify-center bg-white flex-row overflow-hidden"
                    activeOpacity={0.7}
                    onPress={handlePickImage}
                >
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                        <Text className="text-[#8a94a6] font-semibold text-[13px]">📸 Upload Photo</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View>
                <Text className="text-[11px] font-bold text-[#8a94a6] uppercase tracking-[1.5px] ml-1 mb-2">
                    Additional Comments
                </Text>
                <View className="border border-[#eaedf2] rounded-[20px] bg-white px-4 min-h-[52px] py-3">
                    <TextInput
                        value={comments}
                        onChangeText={(text) => setResponse(category, question, { comments: text })}
                        placeholder="Type here..."
                        placeholderTextColor="#a0aab8"
                        multiline
                        scrollEnabled={false}
                        className="text-[15px] text-[#1e1e2d] font-medium leading-[20px]"
                        style={{ paddingTop: 0, paddingBottom: 0, textAlignVertical: 'top' }}
                    />
                </View>
            </View>
        </View>
    );
}
