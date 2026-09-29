import { Image, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { palette, useTheme } from '@/shared/theme';

/**
 * The design's circular back button (44px, glass) for screens inside stacks
 * where the native header is hidden.
 */
export function BackButton({ onPress }: { onPress: () => void }) {
    const { palette, radii, blur } = useTheme();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onPress}
            style={({ pressed }) => [styles.button, { borderRadius: radii.pill }, pressed && { opacity: 0.7 }]}
        >
            <BlurView intensity={blur.card} tint="dark"
                      style={[StyleSheet.absoluteFill, { borderRadius: radii.pill }]}/>
            <View style={[StyleSheet.absoluteFill, { borderRadius: radii.pill }]}/>
            <Image source={require('../../../assets/back.png')}/>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 48,
        height: 48,
        borderWidth: 1,
        borderColor: "#535353",
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
});
