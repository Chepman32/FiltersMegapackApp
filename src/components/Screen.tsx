import type { PropsWithChildren } from 'react';
import {
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { palette } from '../theme/colors';

interface ScreenViewProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
}

interface ScreenScrollViewProps
  extends Omit<ScrollViewProps, 'contentContainerStyle' | 'style'>,
    PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
}

const DEFAULT_EDGES: Edge[] = ['top'];

export function ScreenView({
  children,
  style,
  edges = DEFAULT_EDGES,
}: ScreenViewProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
      {children}
    </SafeAreaView>
  );
}

export function ScreenScrollView({
  children,
  style,
  contentContainerStyle,
  edges = DEFAULT_EDGES,
  ...scrollViewProps
}: ScreenScrollViewProps) {
  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <ScrollView
        {...scrollViewProps}
        contentContainerStyle={contentContainerStyle}
        style={[styles.scrollView, style]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  scrollView: {
    flex: 1,
  },
});
