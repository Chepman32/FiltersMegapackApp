import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { palette } from '../theme/colors';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenView } from '../components/Screen';
import { useStudioStore } from '../store/useStudioStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const setOnboardingSeen = useStudioStore(state => state.setOnboardingSeen);

  return (
    <ScreenView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>{t('onboarding.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>
      </View>
      <PrimaryButton
        label={t('onboarding.cta')}
        onPress={() => {
          setOnboardingSeen(true);
          navigation.replace('Studio');
        }}
      />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingHorizontal: 24,
    paddingBottom: 44,
    justifyContent: 'space-between',
  },
  hero: {
    marginTop: 72,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
  },
  subtitle: {
    color: palette.textSecondary,
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
  },
});
