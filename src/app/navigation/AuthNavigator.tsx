import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SignInScreen, EmailEntryScreen, EmailSignInScreen, EmailSignUpScreen, CheckEmailScreen } from '@/screens/auth';
import { useTheme } from '@/shared/theme';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
    const { palette } = useTheme();

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: palette.background },
            }}
        >
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="EmailEntry" component={EmailEntryScreen} />
            <Stack.Screen name="EmailSignIn" component={EmailSignInScreen} />
            <Stack.Screen name="EmailSignUp" component={EmailSignUpScreen} />
            <Stack.Screen name="CheckEmail" component={CheckEmailScreen} />
        </Stack.Navigator>
    );
}
