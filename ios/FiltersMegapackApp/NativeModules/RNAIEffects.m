#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RNAIEffects, NSObject)

RCT_EXTERN_METHOD(segmentSubject:(NSString *)inputPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeBackground:(NSString *)inputPath
                  maskPath:(NSString *)maskPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(upscaleImage:(NSString *)inputPath
                  scale:(NSNumber *)scale
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(applyMask:(NSString *)inputPath
                  maskPath:(NSString *)maskPath
                  backgroundHex:(NSString *)backgroundHex
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
