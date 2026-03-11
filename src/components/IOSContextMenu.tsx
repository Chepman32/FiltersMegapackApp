import {
  Platform,
  UIManager,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
  requireNativeComponent,
} from 'react-native';
import type { ReactNode } from 'react';

export interface IOSContextMenuAction {
  id: string;
  title: string;
  subtitle?: string;
  systemIcon?: string;
  destructive?: boolean;
  disabled?: boolean;
  children?: IOSContextMenuAction[];
}

interface IOSContextMenuProps extends ViewProps {
  children: ReactNode;
  actions: IOSContextMenuAction[];
  onPressAction: (actionId: string) => void;
  style?: StyleProp<ViewStyle>;
}

interface NativeMenuEvent {
  nativeEvent: {
    actionId: string;
  };
}

interface NativeContextMenuViewProps extends ViewProps {
  menuConfig: {
    actions: IOSContextMenuAction[];
  };
  onPressMenuItem?: (event: NativeMenuEvent) => void;
}

const viewManagerName = 'RNContextMenuViewManager';
const NativeContextMenuView =
  Platform.OS === 'ios' &&
  UIManager.getViewManagerConfig?.(viewManagerName)
    ? requireNativeComponent<NativeContextMenuViewProps>(viewManagerName)
    : null;

export function IOSContextMenu({
  actions,
  children,
  onPressAction,
  style,
  ...viewProps
}: IOSContextMenuProps) {
  if (Platform.OS !== 'ios' || !NativeContextMenuView || actions.length === 0) {
    return (
      <View {...viewProps} style={style}>
        {children}
      </View>
    );
  }

  return (
    <NativeContextMenuView
      {...viewProps}
      menuConfig={{ actions }}
      onPressMenuItem={event => onPressAction(event.nativeEvent.actionId)}
      style={style}
    >
      {children}
    </NativeContextMenuView>
  );
}
