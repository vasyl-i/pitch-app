import { ImageBackground, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { SuccessCat } from '../../../../assets/svg';
import { typography, useTheme } from '@/shared/theme';

export const MainBanner = () => {
    const { palette } = useTheme();

    return (
        <ImageBackground source={require('../../../../assets/background.png')}
                         style={{ borderRadius: 20, padding: 30, overflow: 'hidden', marginTop: 16 }}>
            <View style={{
                flex: 1,
                flexDirection: 'row',
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <View style={{
                    flexDirection: 'column',
                    maxWidth: "60%",
                    gap: 4,
                }}>
                    <AppText variant={'body'} color={palette.buttonPrimaryText}
                             style={{ fontSize: 24, fontFamily: typography.family.medium }}>
                    Find. Hit. Shine!
                    </AppText>
                    <AppText color={"#3D3E42"} style={{ fontSize: 16, fontFamily: typography.family.regular  }}>
                        Practice a little every day
                        and see the difference!
                    </AppText>
                </View>
                <SuccessCat/>
            </View>
        </ImageBackground>
    )
}
