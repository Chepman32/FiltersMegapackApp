import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { MenuView, type MenuAction } from '@react-native-menu/menu';

export interface IOSContextMenuAction {
  id: string;
  title: string;
  subtitle?: string;
  systemIcon?: string;
  destructive?: boolean;
  disabled?: boolean;
  children?: IOSContextMenuAction[];
  displayInline?: boolean;
}

interface IOSContextMenuProps extends ViewProps {
  children: ReactNode;
  actions: IOSContextMenuAction[];
  onPressAction: (actionId: string) => void;
  style?: StyleProp<ViewStyle>;
}

function mapActions(actions: IOSContextMenuAction[]): MenuAction[] {
  return actions.map(action => ({
    id: action.id,
    title: action.title,
    subtitle: action.subtitle,
    image: action.systemIcon,
    displayInline: action.displayInline,
    attributes: {
      destructive: action.destructive,
      disabled: action.disabled,
    },
    subactions: action.children ? mapActions(action.children) : undefined,
  }));
}

export function IOSContextMenu({
  actions,
  children,
  onPressAction,
  style,
  testID,
  ...viewProps
}: IOSContextMenuProps) {
  if (Platform.OS !== 'ios' || actions.length === 0) {
    return (
      <View {...viewProps} style={style}>
        {children}
      </View>
    );
  }

  return (
    <MenuView
      actions={mapActions(actions)}
      onPressAction={event => onPressAction(event.nativeEvent.event)}
      shouldOpenOnLongPress
      style={style}
      testID={testID}
      themeVariant="light"
    >
      {children}
    </MenuView>
  );
}
