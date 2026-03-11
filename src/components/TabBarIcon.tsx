import { StyleSheet, View } from 'react-native';

type TabBarIconKind = 'home' | 'mixes' | 'collage' | 'settings';

interface TabBarIconProps {
  kind: TabBarIconKind;
  color: string;
  focused: boolean;
}

export function TabBarIcon({ kind, color, focused }: TabBarIconProps) {
  return (
    <View style={[styles.frame, focused ? styles.frameFocused : undefined]}>
      {kind === 'home' ? <HomeIcon color={color} /> : null}
      {kind === 'mixes' ? <MixesIcon color={color} /> : null}
      {kind === 'collage' ? <CollageIcon color={color} /> : null}
      {kind === 'settings' ? <SettingsIcon color={color} /> : null}
    </View>
  );
}

function HomeIcon({ color }: { color: string }) {
  return (
    <View style={styles.canvas}>
      <View style={[styles.homeRoofLeft, { backgroundColor: color }]} />
      <View style={[styles.homeRoofRight, { backgroundColor: color }]} />
      <View style={[styles.homeBody, { borderColor: color }]} />
      <View style={[styles.homeDoor, { backgroundColor: color }]} />
    </View>
  );
}

function MixesIcon({ color }: { color: string }) {
  return (
    <View style={styles.canvas}>
      <View style={[styles.mixCard, styles.mixCardPrimary, { borderColor: color }]} />
      <View style={[styles.mixCard, styles.mixCardSecondary, { borderColor: color }]} />
      <View style={[styles.mixGlow, { backgroundColor: color }]} />
    </View>
  );
}

function CollageIcon({ color }: { color: string }) {
  return (
    <View style={styles.canvas}>
      <View style={[styles.collageCell, styles.collageCellTopLeft, { borderColor: color }]} />
      <View style={[styles.collageCell, styles.collageCellTopRight, { borderColor: color }]} />
      <View style={[styles.collageCell, styles.collageCellBottomLeft, { borderColor: color }]} />
      <View style={[styles.collageCell, styles.collageCellBottomRight, { borderColor: color }]} />
    </View>
  );
}

function SettingsIcon({ color }: { color: string }) {
  return (
    <View style={styles.canvas}>
      <View style={[styles.settingsRing, { borderColor: color }]} />
      <View style={[styles.settingsCenter, { backgroundColor: color }]} />
      <View style={[styles.settingsSpoke, { backgroundColor: color, transform: [{ rotate: '0deg' }] }]} />
      <View style={[styles.settingsSpoke, { backgroundColor: color, transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.settingsSpoke, { backgroundColor: color, transform: [{ rotate: '90deg' }] }]} />
      <View style={[styles.settingsSpoke, { backgroundColor: color, transform: [{ rotate: '135deg' }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 26,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameFocused: {
    transform: [{ scale: 1.03 }],
  },
  canvas: {
    width: 22,
    height: 22,
  },
  homeBody: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 3,
    height: 12,
    borderWidth: 1.7,
    borderRadius: 4,
  },
  homeRoofLeft: {
    position: 'absolute',
    top: 3,
    left: 4,
    width: 9,
    height: 2.2,
    borderRadius: 1.2,
    transform: [{ rotate: '-38deg' }],
  },
  homeRoofRight: {
    position: 'absolute',
    top: 3,
    right: 4,
    width: 9,
    height: 2.2,
    borderRadius: 1.2,
    transform: [{ rotate: '38deg' }],
  },
  homeDoor: {
    position: 'absolute',
    bottom: 3,
    left: 9,
    width: 4,
    height: 6,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  mixCard: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderWidth: 1.7,
    borderRadius: 4,
  },
  mixCardPrimary: {
    top: 4,
    left: 3,
  },
  mixCardSecondary: {
    bottom: 4,
    right: 3,
  },
  mixGlow: {
    position: 'absolute',
    top: 8.5,
    left: 8.5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  collageCell: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderWidth: 1.7,
    borderRadius: 2.5,
  },
  collageCellTopLeft: {
    top: 3,
    left: 3,
  },
  collageCellTopRight: {
    top: 3,
    right: 3,
  },
  collageCellBottomLeft: {
    bottom: 3,
    left: 3,
  },
  collageCellBottomRight: {
    bottom: 3,
    right: 3,
  },
  settingsRing: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 12,
    height: 12,
    borderWidth: 1.7,
    borderRadius: 6,
  },
  settingsCenter: {
    position: 'absolute',
    top: 9,
    left: 9,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  settingsSpoke: {
    position: 'absolute',
    top: 2,
    left: 10,
    width: 2,
    height: 18,
    borderRadius: 1,
  },
});
