#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(RNContextMenuViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(menuConfig, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(onPressMenuItem, RCTBubblingEventBlock)

@end
