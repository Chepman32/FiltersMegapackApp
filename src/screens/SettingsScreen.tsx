import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  interpolateColor,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import i18n from '../localization/i18n';
import { palette } from '../theme/colors';
import { ScreenScrollView } from '../components/Screen';
import { useStudioStore } from '../store/useStudioStore';
import { FilterEngine, type FilterEngineCapabilities } from '../native/FilterEngine';
import { FILTER_CATEGORIES } from '../filters/filterCatalog';

const APP_VERSION = '1.0.0';
const ROW_HEIGHT = 52;
const ROW_GAP = 4;
const ROW_STRIDE = ROW_HEIGHT + ROW_GAP;
const REORDER_LAYOUT = LinearTransition.springify()
  .damping(20)
  .stiffness(250)
  .mass(0.9);
const RETURN_SPRING = { damping: 18, stiffness: 260, mass: 0.9 };
const DROP_SPRING = { damping: 19, stiffness: 230, mass: 0.92 };
const NEIGHBOR_SPRING = { damping: 18, stiffness: 260, mass: 0.9 };
const LIFT_SPRING = { damping: 17, stiffness: 250, mass: 0.84 };

type CategoryMeta = { color: string; titleKey: string };

function clampIndex(value: number, totalCount: number) {
  'worklet';
  return Math.min(Math.max(0, value), totalCount - 1);
}

interface DraggableRowProps {
  color: string;
  label: string;
  index: number;
  totalCount: number;
  activeIndex: SharedValue<number>;
  hoverIndex: SharedValue<number>;
  dragY: SharedValue<number>;
  dragVelocityY: SharedValue<number>;
  isSettling: SharedValue<number>;
  onDragEnd: (from: number, to: number) => void;
}

function DraggableCategoryRow({
  color,
  label,
  index,
  totalCount,
  activeIndex,
  hoverIndex,
  dragY,
  dragVelocityY,
  isSettling,
  onDragEnd,
}: DraggableRowProps) {
  const liftProgress = useDerivedValue(() =>
    withSpring(activeIndex.value === index ? 1 : 0, LIFT_SPRING),
  );

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      isSettling.value = 0;
      activeIndex.value = index;
      hoverIndex.value = index;
      dragVelocityY.value = 0;
      dragY.value = 0;
    })
    .onUpdate(e => {
      dragY.value = e.translationY;
      dragVelocityY.value = e.velocityY;
      hoverIndex.value = clampIndex(
        Math.round(index + e.translationY / ROW_STRIDE),
        totalCount,
      );
    })
    .onEnd(e => {
      const to = clampIndex(Math.round(index + dragY.value / ROW_STRIDE), totalCount);

      isSettling.value = 1;
      hoverIndex.value = to;
      dragVelocityY.value = e.velocityY;
      dragY.value = withSpring(
        (to - index) * ROW_STRIDE,
        {
          ...DROP_SPRING,
          velocity: e.velocityY,
        },
        finished => {
          if (!finished) {
            return;
          }

          dragVelocityY.value = 0;
          dragY.value = 0;
          activeIndex.value = -1;
          hoverIndex.value = -1;
          isSettling.value = 0;

          if (to !== index) {
            runOnJS(onDragEnd)(index, to);
          }
        },
      );
    })
    .onFinalize(() => {
      if (isSettling.value || activeIndex.value !== index) {
        return;
      }

      isSettling.value = 1;
      hoverIndex.value = index;
      dragVelocityY.value = 0;
      dragY.value = withSpring(0, RETURN_SPRING, finished => {
        if (!finished) {
          return;
        }

        dragY.value = 0;
        hoverIndex.value = -1;
        activeIndex.value = -1;
        isSettling.value = 0;
      });
    });

  const animStyle = useAnimatedStyle(() => {
    const active = activeIndex.value;
    const hovered = hoverIndex.value;
    const isActive = active === index;
    const lift = liftProgress.value;

    const baseStyle = {
      backgroundColor: interpolateColor(
        lift,
        [0, 1],
        [palette.panel, palette.panelElevated],
      ),
      borderColor: interpolateColor(lift, [0, 1], [palette.border, color]),
      shadowColor: color,
    };

    if (isActive) {
      const velocityTilt = Math.max(-1, Math.min(1, dragVelocityY.value / 1800));
      return {
        ...baseStyle,
        transform: [
          { translateY: dragY.value },
          { scale: 1 + lift * 0.042 },
          { rotateZ: `${velocityTilt * 2.6}deg` },
        ],
        zIndex: 100,
        shadowOpacity: 0.16 + lift * 0.14,
        shadowRadius: 14 + lift * 10,
        shadowOffset: { width: 0, height: 10 + lift * 6 },
        shadowColor: color,
        opacity: 0.96,
      };
    }

    if (active < 0) {
      return {
        ...baseStyle,
        transform: [
          { translateY: withSpring(0, NEIGHBOR_SPRING) },
          { scale: withSpring(1, LIFT_SPRING) },
        ],
        zIndex: 0,
        shadowOpacity: 0,
        opacity: 1,
      };
    }

    let shift = 0;
    if (active < hovered && index > active && index <= hovered) {
      shift = -ROW_STRIDE;
    } else if (active > hovered && index >= hovered && index < active) {
      shift = ROW_STRIDE;
    }

    return {
      ...baseStyle,
      transform: [
        { translateY: withSpring(shift, NEIGHBOR_SPRING) },
        { scale: withSpring(0.985, LIFT_SPRING) },
      ],
      zIndex: 0,
      shadowOpacity: 0,
      opacity: withSpring(0.9, RETURN_SPRING),
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View layout={REORDER_LAYOUT} style={[styles.categoryRow, animStyle]}>
        <View style={[styles.categoryDot, { backgroundColor: color }]} />
        <Text style={styles.categoryName}>{label}</Text>
        <View style={styles.dragHandle}>
          <View style={styles.dragLine} />
          <View style={styles.dragLine} />
          <View style={styles.dragLine} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const {
    language,
    performanceMode,
    categoryOrder,
    setLanguage,
    setPerformanceMode,
    clearRecents,
    setOnboardingSeen,
    setCategoryOrder,
    resetCategoryOrder,
  } = useStudioStore();

  const categoryMap = new Map<string, CategoryMeta>(
    FILTER_CATEGORIES.map(c => [c.id, { color: c.color, titleKey: c.titleKey }]),
  );

  const activeIndex = useSharedValue(-1);
  const hoverIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const dragVelocityY = useSharedValue(0);
  const isSettling = useSharedValue(0);

  const [capabilities, setCapabilities] = useState<FilterEngineCapabilities | null>(null);

  useEffect(() => {
    FilterEngine.listCapabilities().then(setCapabilities).catch(() => {
      setCapabilities(null);
    });
  }, []);

  const switchLanguage = async (nextLanguage: 'en' | 'ru') => {
    setLanguage(nextLanguage);
    await i18n.changeLanguage(nextLanguage);
  };

  const onDragEnd = (from: number, to: number) => {
    const next = [...categoryOrder];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setCategoryOrder(next);
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('common.settings')}</Text>

      <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
      <View style={styles.row}>
        {(['en', 'ru'] as const).map(lng => (
          <Pressable
            key={lng}
            onPress={() => switchLanguage(lng)}
            style={[
              styles.choice,
              language === lng ? styles.choiceActive : undefined,
            ]}
          >
            <Text style={styles.choiceLabel}>{lng.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('settings.performance')}</Text>
      <Pressable
        onPress={() => setPerformanceMode(!performanceMode)}
        style={[styles.choice, performanceMode ? styles.choiceActive : undefined]}
      >
        <Text style={styles.choiceLabel}>{performanceMode ? 'ON' : 'OFF'}</Text>
      </Pressable>

      <Pressable onPress={clearRecents} style={styles.action}>
        <Text style={styles.actionLabel}>{t('settings.clearRecents')}</Text>
      </Pressable>
      <Pressable onPress={() => setOnboardingSeen(false)} style={styles.action}>
        <Text style={styles.actionLabel}>{t('settings.resetOnboarding')}</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>{t('settings.categoriesOrder')}</Text>
      <View style={styles.categoryList}>
        {categoryOrder.map((id, index) => {
          const cat = categoryMap.get(id);
          if (!cat) return null;
          return (
            <DraggableCategoryRow
              key={id}
              color={cat.color}
              label={t(cat.titleKey)}
              index={index}
              totalCount={categoryOrder.length}
              activeIndex={activeIndex}
              hoverIndex={hoverIndex}
              dragY={dragY}
              dragVelocityY={dragVelocityY}
              isSettling={isSettling}
              onDragEnd={onDragEnd}
            />
          );
        })}
      </View>
      <Pressable onPress={resetCategoryOrder} style={styles.action}>
        <Text style={styles.actionLabel}>{t('settings.resetOrder')}</Text>
      </Pressable>

      <View style={styles.capabilities}>
        <Text style={styles.sectionTitle}>Native capabilities</Text>
        <Text style={styles.capabilityText}>
          Metal:{' '}
          {capabilities?.supportsMetal === undefined
            ? 'unknown'
            : capabilities.supportsMetal
              ? 'yes'
              : 'no'}
        </Text>
        <Text style={styles.capabilityText}>
          Live Photo: {capabilities?.supportsLivePhoto ? 'yes' : 'no'}
        </Text>
        <Text style={styles.capabilityText}>
          GIF pipeline: {capabilities?.supportsGif ? 'yes' : 'no'}
        </Text>
      </View>

      <Text style={styles.version}>
        {t('settings.appVersion')}: {APP_VERSION}
      </Text>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 27,
    fontWeight: '800',
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 8,
    color: palette.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  choice: {
    minWidth: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  choiceActive: {
    borderColor: palette.accent,
    backgroundColor: '#16293e',
  },
  choiceLabel: {
    color: palette.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  action: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  actionLabel: {
    color: palette.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  categoryList: {
    gap: ROW_GAP,
  },
  categoryRow: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  categoryName: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  dragHandle: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: palette.textSecondary,
    opacity: 0.5,
  },
  capabilities: {
    marginTop: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  capabilityText: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  version: {
    marginTop: 20,
    color: palette.textSecondary,
    fontSize: 12,
  },
});
