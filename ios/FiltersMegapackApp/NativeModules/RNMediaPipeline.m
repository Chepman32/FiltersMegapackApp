#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RNMediaPipeline, NSObject)

RCT_EXTERN_METHOD(importAsset:(NSString *)inputPath
                  kind:(NSString *)kind
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(exportAsset:(NSString *)inputPath
                  outputKind:(NSString *)outputKind
                  quality:(NSNumber *)quality
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(transcodeVideo:(NSString *)inputPath
                  preset:(NSString *)preset
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(composeLivePhoto:(NSString *)imagePath
                  videoPath:(NSString *)videoPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(encodeGif:(NSString *)inputPath
                  fps:(NSNumber *)fps
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
