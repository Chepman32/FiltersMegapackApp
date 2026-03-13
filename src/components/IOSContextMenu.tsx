import { useRef, type ComponentProps, type ComponentType, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
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
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

type MenuViewCompatProps = ComponentProps<typeof MenuView> & ViewProps;
const MenuViewCompat = MenuView as unknown as ComponentType<MenuViewCompatProps>;

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
  onPress,
  onPressAction,
  style,
  testID,
  ...viewProps
}: IOSContextMenuProps) {
  const skipNextTapRef = useRef(false);

  if (Platform.OS !== 'ios' || actions.length === 0) {
    if (onPress) {
      return (
        <Pressable
          {...viewProps}
          accessibilityRole="button"
          onPress={onPress}
          style={style}
          testID={testID}
        >
          {children}
        </Pressable>
      );
    }
    return (
      <View {...viewProps} style={style}>
        {children}
      </View>
    );
  }

  return (
    <MenuViewCompat
      actions={mapActions(actions)}
      onOpenMenu={() => {
        skipNextTapRef.current = true;
      }}
      onPressAction={event => onPressAction(event.nativeEvent.event)}
      shouldOpenOnLongPress
      style={style}
      testID={testID}
      themeVariant="light"
    >
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (skipNextTapRef.current) {
              skipNextTapRef.current = false;
              return;
            }
            onPress();
          }}
        >
          {children}
        </Pressable>
      ) : (
        children
      )}
    </MenuViewCompat>
  );
}
