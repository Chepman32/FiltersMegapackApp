import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import AVFoundation
import CoreImage
import Photos
import Vision
import ImageIO
import UniformTypeIdentifiers

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "FiltersMegapackApp",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

private struct FilterOperation {
  let type: String
  let amount: CGFloat
  let secondaryAmount: CGFloat?
}

private final class NativeImageIO {
  static func normalizeURL(_ path: String) -> URL {
    if path.hasPrefix("file://"), let url = URL(string: path) {
      return url
    }
    return URL(fileURLWithPath: path)
  }

  static func tempURL(_ ext: String) -> URL {
    let fileName = "fm_\(UUID().uuidString).\(ext)"
    return URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(fileName)
  }
}

@objc(RNFilterEngine)
class RNFilterEngine: NSObject, RCTBridgeModule {
  static func moduleName() -> String! {
    "RNFilterEngine"
  }

  static func requiresMainQueueSetup() -> Bool {
    false
  }

  private let ciContext = CIContext(options: [.useSoftwareRenderer: false])

  @objc(listCapabilities:rejecter:)
  func listCapabilities(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve([
      "supportsMetal": true,
      "supportsLivePhoto": true,
      "supportsGif": true,
      "supportsRealtimePreview": true
    ])
  }

  @objc(renderPreview:options:resolver:rejecter:)
  func renderPreview(
    _ inputPath: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    renderImageLike(mode: "preview", inputPath: inputPath, options: options, resolver: resolve, rejecter: reject)
  }

  @objc(renderFull:options:resolver:rejecter:)
  func renderFull(
    _ inputPath: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let kind = (options["kind"] as? String) ?? "photo"
    if kind == "video" {
      renderVideo(inputPath: inputPath, options: options, resolver: resolve, rejecter: reject)
      return
    }
    renderImageLike(mode: "full", inputPath: inputPath, options: options, resolver: resolve, rejecter: reject)
  }

  @objc(generateThumbnail:options:resolver:rejecter:)
  func generateThumbnail(
    _ inputPath: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    renderImageLike(mode: "thumb", inputPath: inputPath, options: options, resolver: resolve, rejecter: reject)
  }

  private func renderImageLike(
    mode: String,
    inputPath: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let inputURL = NativeImageIO.normalizeURL(inputPath)
        guard var image = CIImage(contentsOf: inputURL, options: [.applyOrientationProperty: true]) else {
          throw NSError(domain: "RNFilterEngine", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Unable to load input image"])
        }
        let operations = self.parseOperations(options["operations"])
        let stack = options["stack"] as? NSDictionary
        let intensity = CGFloat((stack?["intensity"] as? NSNumber)?.doubleValue ?? 1.0)
        let maxDimension = CGFloat((options["maxDimension"] as? NSNumber)?.doubleValue ?? (mode == "thumb" ? 280 : 2560))
        let quality = CGFloat((options["quality"] as? NSNumber)?.doubleValue ?? 0.92)

        image = self.scaleImageIfNeeded(image: image, maxDimension: maxDimension)
        image = self.applyOperations(image: image, operations: operations, intensity: intensity)

        let outputURL = NativeImageIO.tempURL("jpg")
        try self.writeJPEG(image: image, outputURL: outputURL, quality: quality)
        resolve([
          "uri": outputURL.path,
          "width": image.extent.width,
          "height": image.extent.height
        ])
      } catch {
        reject("render_failed", error.localizedDescription, error)
      }
    }
  }

  private func renderVideo(
    inputPath: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let inputURL = NativeImageIO.normalizeURL(inputPath)
    let asset = AVAsset(url: inputURL)
    guard let export = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetHighestQuality) else {
      reject("video_export_init_failed", "Could not initialize video export session", nil)
      return
    }
    let operations = parseOperations(options["operations"])
    let stack = options["stack"] as? NSDictionary
    let intensity = CGFloat((stack?["intensity"] as? NSNumber)?.doubleValue ?? 1.0)

    let videoComposition = AVVideoComposition(asset: asset) { request in
      let source = request.sourceImage.clampedToExtent()
      let rendered = self.applyOperations(image: source, operations: operations, intensity: intensity).cropped(to: request.sourceImage.extent)
      request.finish(with: rendered, context: nil)
    }

    let outputURL = NativeImageIO.tempURL("mp4")
    try? FileManager.default.removeItem(at: outputURL)
    export.outputURL = outputURL
    export.outputFileType = .mp4
    export.shouldOptimizeForNetworkUse = true
    export.videoComposition = videoComposition
    export.exportAsynchronously {
      switch export.status {
      case .completed:
        resolve(["uri": outputURL.path])
      case .failed, .cancelled:
        reject("video_export_failed", export.error?.localizedDescription ?? "Failed to render video", export.error)
      default:
        break
      }
    }
  }

  private func parseOperations(_ raw: Any?) -> [FilterOperation] {
    guard let operationDictionaries = raw as? [NSDictionary] else {
      return []
    }
    return operationDictionaries.compactMap { dictionary in
      guard let type = dictionary["type"] as? String else {
        return nil
      }
      let amount = CGFloat((dictionary["amount"] as? NSNumber)?.doubleValue ?? 0)
      let secondaryAmount = (dictionary["secondaryAmount"] as? NSNumber).map { CGFloat($0.doubleValue) }
      return FilterOperation(type: type, amount: amount, secondaryAmount: secondaryAmount)
    }
  }

  private func scaleImageIfNeeded(image: CIImage, maxDimension: CGFloat) -> CIImage {
    let extent = image.extent
    let largestDimension = max(extent.width, extent.height)
    guard maxDimension > 0, largestDimension > maxDimension else {
      return image
    }
    let scale = maxDimension / largestDimension
    return image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
  }

  private func writeJPEG(image: CIImage, outputURL: URL, quality: CGFloat) throws {
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    guard let data = ciContext.jpegRepresentation(
      of: image,
      colorSpace: colorSpace,
      options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: quality]
    ) else {
      throw NSError(domain: "RNFilterEngine", code: 1002, userInfo: [NSLocalizedDescriptionKey: "Unable to encode JPEG"])
    }
    try data.write(to: outputURL)
  }

  private func applyOperations(image: CIImage, operations: [FilterOperation], intensity: CGFloat) -> CIImage {
    var output = image
    let center = CIVector(x: image.extent.midX, y: image.extent.midY)

    operations.forEach { operation in
      let weighted = operation.amount * intensity
      switch operation.type {
      case "exposure":
        output = output.applyingFilter("CIExposureAdjust", parameters: ["inputEV": weighted])
      case "contrast":
        output = output.applyingFilter("CIColorControls", parameters: ["inputContrast": max(0.1, weighted)])
      case "saturation":
        output = output.applyingFilter("CIColorControls", parameters: ["inputSaturation": max(0, weighted)])
      case "vibrance":
        output = output.applyingFilter("CIVibrance", parameters: ["inputAmount": weighted])
      case "temperature":
        let neutral = CIVector(x: 6500, y: 0)
        // Some catalog entries were authored with Kelvin-like secondary values.
        // Core Image expects the tint component here, so clamp invalid ranges to neutral.
        let tintComponent: CGFloat
        if let secondaryAmount = operation.secondaryAmount, abs(secondaryAmount) <= 200 {
          tintComponent = secondaryAmount
        } else {
          tintComponent = 0
        }
        let target = CIVector(x: weighted, y: tintComponent)
        output = output.applyingFilter(
          "CITemperatureAndTint",
          parameters: ["inputNeutral": neutral, "inputTargetNeutral": target]
        )
      case "tint":
        let neutral = CIVector(x: 6500, y: 0)
        let target = CIVector(x: 6500, y: weighted)
        output = output.applyingFilter(
          "CITemperatureAndTint",
          parameters: ["inputNeutral": neutral, "inputTargetNeutral": target]
        )
      case "vignette":
        output = output.applyingFilter("CIVignette", parameters: ["inputIntensity": weighted, "inputRadius": 2.2])
      case "grain":
        let noise = CIImage(color: CIColor(red: 0.5, green: 0.5, blue: 0.5, alpha: weighted * 0.18))
          .cropped(to: output.extent)
          .applyingFilter("CIRandomGenerator")
          .cropped(to: output.extent)
        output = noise.applyingFilter("CISoftLightBlendMode", parameters: [kCIInputBackgroundImageKey: output])
      case "sharpen":
        output = output.applyingFilter("CISharpenLuminance", parameters: ["inputSharpness": weighted])
      case "blur":
        output = output.applyingFilter("CIGaussianBlur", parameters: ["inputRadius": abs(weighted)]).cropped(to: output.extent)
      case "hue":
        output = output.applyingFilter("CIHueAdjust", parameters: ["inputAngle": weighted])
      case "highlights":
        output = output.applyingFilter("CIHighlightShadowAdjust", parameters: ["inputHighlightAmount": weighted])
      case "shadows":
        output = output.applyingFilter("CIHighlightShadowAdjust", parameters: ["inputShadowAmount": weighted])
      case "bloom":
        output = output.applyingFilter("CIBloom", parameters: ["inputIntensity": weighted, "inputRadius": 10])
      case "monochrome":
        output = output.applyingFilter(
          "CIColorMonochrome",
          parameters: ["inputIntensity": weighted, "inputColor": CIColor(red: 0.85, green: 0.85, blue: 0.85)]
        )
      case "edge":
        output = output.applyingFilter("CIEdges", parameters: ["inputIntensity": weighted * 8.0])
      case "posterize":
        output = output.applyingFilter("CIColorPosterize", parameters: ["inputLevels": max(2, weighted)])
      case "pixelate":
        output = output.applyingFilter("CIPixellate", parameters: ["inputScale": max(1, weighted), kCIInputCenterKey: center])
      case "zoomBlur":
        output = output.applyingFilter("CIZoomBlur", parameters: [kCIInputCenterKey: center, "inputAmount": weighted])
      case "halftone":
        output = output.applyingFilter("CICMYKHalftone", parameters: [kCIInputCenterKey: center, "inputWidth": max(4, weighted * 30)])
      case "twirl":
        output = output.applyingFilter("CITwirlDistortion", parameters: [kCIInputCenterKey: center, kCIInputRadiusKey: output.extent.width * 0.55, kCIInputAngleKey: weighted * 3.14])
      case "vortex":
        output = output.applyingFilter("CIVortexDistortion", parameters: [kCIInputCenterKey: center, kCIInputRadiusKey: output.extent.width * 0.5, kCIInputAngleKey: weighted * 3.14])
      case "kaleidoscope":
        output = output.applyingFilter("CIKaleidoscope", parameters: [kCIInputCenterKey: center, "inputAngle": weighted * 3.14, "inputCount": 6])
      case "crystallize":
        output = output.applyingFilter("CICrystallize", parameters: [kCIInputCenterKey: center, "inputRadius": 4 + weighted * 30])
      case "comic":
        output = output.applyingFilter("CIComicEffect")
      case "noir":
        output = output.applyingFilter("CIPhotoEffectNoir")
      case "thermal":
        output = output.applyingFilter("CIThermal")
      case "xray":
        output = output.applyingFilter("CIXRay")
      case "chromaShift":
        let shiftedR = output
          .applyingFilter("CIColorMatrix", parameters: [
            "inputRVector": CIVector(x: 1, y: 0, z: 0, w: 0),
            "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 0),
            "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 0),
            "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1)
          ])
          .transformed(by: CGAffineTransform(translationX: weighted * 12, y: 0))
        let shiftedB = output
          .applyingFilter("CIColorMatrix", parameters: [
            "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 0),
            "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 0),
            "inputBVector": CIVector(x: 0, y: 0, z: 1, w: 0),
            "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1)
          ])
          .transformed(by: CGAffineTransform(translationX: -weighted * 12, y: 0))
        output = shiftedR.applyingFilter("CIScreenBlendMode", parameters: [kCIInputBackgroundImageKey: output])
        output = shiftedB.applyingFilter("CIScreenBlendMode", parameters: [kCIInputBackgroundImageKey: output])
      case "lightLeak":
        let radius = max(output.extent.width, output.extent.height) * 0.8
        let leak = CIFilter(
          name: "CIRadialGradient",
          parameters: [
            "inputCenter": CIVector(x: output.extent.maxX * 0.9, y: output.extent.maxY * 0.12),
            "inputRadius0": radius * 0.05,
            "inputRadius1": radius,
            "inputColor0": CIColor(red: 1.0, green: 0.55, blue: 0.15, alpha: weighted * 0.4),
            "inputColor1": CIColor(red: 0.95, green: 0.3, blue: 0.7, alpha: 0)
          ]
        )?.outputImage?.cropped(to: output.extent)
        if let leak {
          output = leak.applyingFilter("CIScreenBlendMode", parameters: [kCIInputBackgroundImageKey: output])
        }
      case "paletteKnife":
        let focus = operation.secondaryAmount ?? 0.74
        output = self.applyPaletteKnife(image: output, amount: weighted, focus: focus)
      case "pencilSketch":
        let detail = operation.secondaryAmount ?? 0.78
        output = self.applyPencilSketch(image: output, amount: weighted, detail: detail)
      default:
        break
      }
    }

    return output
  }

  private func applyPaletteKnife(image: CIImage, amount: CGFloat, focus: CGFloat) -> CIImage {
    let strength = max(0, min(amount, 1.4))
    let extent = image.extent

    // Step 1: Gentle color boost (preserve natural tones)
    let boosted = image
      .applyingFilter("CIColorControls", parameters: [
        kCIInputSaturationKey: 1.04 + strength * 0.10,
        kCIInputContrastKey: 1.02 + strength * 0.05,
        kCIInputBrightnessKey: 0.0
      ])
      .applyingFilter("CIVibrance", parameters: [
        "inputAmount": 0.05 + strength * 0.10
      ])

    // Step 2: Flatten into paint-like patches (heavy blur + subtle posterize)
    let patches = boosted
      .applyingFilter("CIGaussianBlur", parameters: [
        kCIInputRadiusKey: 5.0 + strength * 8.0
      ])
      .cropped(to: extent)
      .applyingFilter("CIColorPosterize", parameters: [
        "inputLevels": max(14.0, 28.0 - strength * 9.0)
      ])
      .applyingFilter("CIGaussianBlur", parameters: [
        kCIInputRadiusKey: 1.5 + strength * 1.0
      ])
      .cropped(to: extent)

    // Step 3: Directional knife strokes (two crossing directions)
    let blurRadius = 3.0 + strength * 7.0
    let primaryStroke = patches
      .applyingFilter("CIMotionBlur", parameters: [
        "inputRadius": blurRadius,
        "inputAngle": 0.3
      ])
      .cropped(to: extent)
    let secondaryStroke = patches
      .applyingFilter("CIMotionBlur", parameters: [
        "inputRadius": blurRadius * 0.6,
        "inputAngle": -0.45
      ])
      .cropped(to: extent)

    // Blend two stroke directions (dissolve = linear, no contrast boost)
    var painted = primaryStroke.applyingFilter("CIDissolveTransition", parameters: [
      kCIInputTargetImageKey: secondaryStroke,
      "inputTime": 0.35
    ])

    // Step 4: Blend back with original to preserve natural color/detail
    painted = painted.applyingFilter("CIDissolveTransition", parameters: [
      kCIInputTargetImageKey: boosted,
      "inputTime": 0.22
    ])

    // Step 5: Very subtle paint ridge highlights
    let ridgeMap = boosted
      .applyingFilter("CIEdges", parameters: [
        "inputIntensity": 1.2 + strength * 2.0
      ])
      .applyingFilter("CIColorControls", parameters: [
        kCIInputSaturationKey: 0.0,
        kCIInputContrastKey: 1.3,
        kCIInputBrightnessKey: -0.15
      ])
    painted = ridgeMap.applyingFilter("CISoftLightBlendMode", parameters: [
      kCIInputBackgroundImageKey: painted
    ])

    // Step 6: Impasto surface texture (directional drag marks)
    let impasto = makeImpastoTexture(extent: extent, amount: strength)
    painted = impasto.applyingFilter("CISoftLightBlendMode", parameters: [
      kCIInputBackgroundImageKey: painted
    ])

    // Step 7: Gentle sharpening
    return painted.applyingFilter("CIUnsharpMask", parameters: [
      "inputRadius": 0.8 + strength * 1.2,
      "inputIntensity": 0.25 + strength * 0.20
    ])
  }

  private func makeFocusMask(extent: CGRect, focus: CGFloat) -> CIImage {
    let baseDimension = min(extent.width, extent.height)
    let innerRadius = baseDimension * (0.18 + focus * 0.08)
    let outerRadius = baseDimension * (0.46 + focus * 0.12)
    return CIFilter(
      name: "CIRadialGradient",
      parameters: [
        "inputCenter": CIVector(x: extent.midX, y: extent.midY),
        "inputRadius0": innerRadius,
        "inputRadius1": outerRadius,
        "inputColor0": CIColor(red: 1, green: 1, blue: 1, alpha: 1),
        "inputColor1": CIColor(red: 0, green: 0, blue: 0, alpha: 0)
      ]
    )?.outputImage?.cropped(to: extent)
      ?? CIImage(color: CIColor(red: 1, green: 1, blue: 1, alpha: 1)).cropped(to: extent)
  }

  private func makeImpastoTexture(extent: CGRect, amount: CGFloat) -> CIImage {
    let clear = CIImage(color: CIColor(red: 0, green: 0, blue: 0, alpha: 0)).cropped(to: extent)
    guard let noiseA = CIFilter(name: "CIRandomGenerator")?.outputImage,
          let noiseB = CIFilter(name: "CIRandomGenerator")?.outputImage else {
      return clear
    }

    // Vertical drag marks: compress X, stretch Y → long vertical streaks
    let dragA = noiseA
      .transformed(by: CGAffineTransform(scaleX: 0.12, y: 2.5))
      .cropped(to: extent)
    // Horizontal drag marks: stretch X, compress Y → long horizontal streaks
    let dragB = noiseB
      .transformed(by: CGAffineTransform(scaleX: 2.5, y: 0.12))
      .cropped(to: extent)

    return dragA
      .applyingFilter("CIScreenBlendMode", parameters: [
        kCIInputBackgroundImageKey: dragB
      ])
      .applyingFilter("CIColorControls", parameters: [
        kCIInputSaturationKey: 0,
        kCIInputBrightnessKey: -0.05,
        kCIInputContrastKey: 1.55 + amount * 0.35
      ])
      .applyingFilter("CIColorMatrix", parameters: [
        "inputRVector": CIVector(x: 0.12, y: 0, z: 0, w: 0),
        "inputGVector": CIVector(x: 0, y: 0.10, z: 0, w: 0),
        "inputBVector": CIVector(x: 0, y: 0, z: 0.09, w: 0),
        "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 0.15 + amount * 0.10)
      ])
  }

  private func applyPencilSketch(image: CIImage, amount: CGFloat, detail: CGFloat) -> CIImage {
    let strength = max(0, min(amount, 1.3))
    let lineDetail = max(0.4, min(detail, 1.2))
    let extent = image.extent
    let center = CIVector(x: extent.midX, y: extent.midY)
    let shortSide = min(extent.width, extent.height)
    let scale = shortSide / 1000.0

    // Step 1: Grayscale (neutral, no contrast boost yet)
    let gray = image.applyingFilter("CIColorControls", parameters: [
      kCIInputSaturationKey: 0,
      kCIInputContrastKey: 1.0,
      kCIInputBrightnessKey: 0.0
    ])

    // Multi-scale dodge-blur for resolution-independent pencil strokes
    let inverted = gray.applyingFilter("CIColorInvert")

    let fineBlur = inverted
      .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 4.0 * scale])
      .cropped(to: extent)
    let fineDodge = fineBlur.applyingFilter("CIColorDodgeBlendMode", parameters: [
      kCIInputBackgroundImageKey: gray
    ])

    let medBlur = inverted
      .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 14.0 * scale])
      .cropped(to: extent)
    let medDodge = medBlur.applyingFilter("CIColorDodgeBlendMode", parameters: [
      kCIInputBackgroundImageKey: gray
    ])

    let coarseBlur = inverted
      .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 30.0 * scale])
      .cropped(to: extent)
    let coarseDodge = coarseBlur.applyingFilter("CIColorDodgeBlendMode", parameters: [
      kCIInputBackgroundImageKey: gray
    ])

    // Blend 40% fine + 35% medium + 25% coarse
    let fineWeighted = fineDodge.applyingFilter("CIColorMatrix", parameters: [
      "inputRVector": CIVector(x: 0.40, y: 0, z: 0, w: 0),
      "inputGVector": CIVector(x: 0, y: 0.40, z: 0, w: 0),
      "inputBVector": CIVector(x: 0, y: 0, z: 0.40, w: 0),
      "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1),
      "inputBiasVector": CIVector(x: 0, y: 0, z: 0, w: 0)
    ])
    let medWeighted = medDodge.applyingFilter("CIColorMatrix", parameters: [
      "inputRVector": CIVector(x: 0.35, y: 0, z: 0, w: 0),
      "inputGVector": CIVector(x: 0, y: 0.35, z: 0, w: 0),
      "inputBVector": CIVector(x: 0, y: 0, z: 0.35, w: 0),
      "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1),
      "inputBiasVector": CIVector(x: 0, y: 0, z: 0, w: 0)
    ])
    let coarseWeighted = coarseDodge.applyingFilter("CIColorMatrix", parameters: [
      "inputRVector": CIVector(x: 0.25, y: 0, z: 0, w: 0),
      "inputGVector": CIVector(x: 0, y: 0.25, z: 0, w: 0),
      "inputBVector": CIVector(x: 0, y: 0, z: 0.25, w: 0),
      "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1),
      "inputBiasVector": CIVector(x: 0, y: 0, z: 0, w: 0)
    ])

    let blend1 = fineWeighted.applyingFilter("CIAdditionCompositing", parameters: [
      kCIInputBackgroundImageKey: medWeighted
    ])
    var sketch = blend1.applyingFilter("CIAdditionCompositing", parameters: [
      kCIInputBackgroundImageKey: coarseWeighted
    ])

    // Step 2: Aggressive tone mapping — push light tones to white
    sketch = sketch.applyingFilter("CIToneCurve", parameters: [
      "inputPoint0": CIVector(x: 0, y: 0),
      "inputPoint1": CIVector(x: 0.15, y: 0.04),
      "inputPoint2": CIVector(x: 0.35, y: 0.45),
      "inputPoint3": CIVector(x: 0.55, y: 0.88),
      "inputPoint4": CIVector(x: 1, y: 1)
    ])

    // Step 3: Dual-scale edge detection
    // Fine edges: thin detail lines
    let fineEdges = gray
      .applyingFilter("CIEdges", parameters: [
        "inputIntensity": 3.0 + lineDetail * 6.0
      ])

    // Bold edges: thick contour lines via pre-blur + edges + morphology
    let preBlurred = gray
      .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 2.0 * scale])
      .cropped(to: extent)
    let boldEdgesRaw = preBlurred
      .applyingFilter("CIEdges", parameters: [
        "inputIntensity": 2.0 + lineDetail * 4.0
      ])
      .applyingFilter("CIMorphologyMaximum", parameters: [
        kCIInputRadiusKey: 1.5 * scale
      ])
      .cropped(to: extent)

    // Combine edges, clamp, invert to get dark lines on white
    let combinedEdges = fineEdges
      .applyingFilter("CIAdditionCompositing", parameters: [
        kCIInputBackgroundImageKey: boldEdgesRaw
      ])
      .applyingFilter("CIColorClamp", parameters: [
        "inputMinComponents": CIVector(x: 0, y: 0, z: 0, w: 0),
        "inputMaxComponents": CIVector(x: 1, y: 1, z: 1, w: 1)
      ])
      .applyingFilter("CIColorInvert")

    // Apply tone curve to edges for cleaner look
    let edgesClean = combinedEdges.applyingFilter("CIToneCurve", parameters: [
      "inputPoint0": CIVector(x: 0, y: 0),
      "inputPoint1": CIVector(x: 0.25, y: 0.1),
      "inputPoint2": CIVector(x: 0.5, y: 0.6),
      "inputPoint3": CIVector(x: 0.75, y: 0.92),
      "inputPoint4": CIVector(x: 1, y: 1)
    ])

    // Multiply edges onto sketch
    sketch = edgesClean.applyingFilter("CIMultiplyBlendMode", parameters: [
      kCIInputBackgroundImageKey: sketch
    ])

    // Step 4: Darkness-masked cross-hatching
    // Create darkness mask from inverted grayscale
    let darknessMask = gray
      .applyingFilter("CIColorInvert")
      .applyingFilter("CIToneCurve", parameters: [
        "inputPoint0": CIVector(x: 0, y: 0),
        "inputPoint1": CIVector(x: 0.25, y: 0),
        "inputPoint2": CIVector(x: 0.45, y: 0.15),
        "inputPoint3": CIVector(x: 0.7, y: 0.7),
        "inputPoint4": CIVector(x: 1, y: 1)
      ])
      .applyingFilter("CIColorControls", parameters: [
        kCIInputSaturationKey: 0
      ])

    let hatch = makeCrossHatchTexture(extent: extent, amount: strength, center: center, darknessMask: darknessMask)
    sketch = hatch.applyingFilter("CIMultiplyBlendMode", parameters: [
      kCIInputBackgroundImageKey: sketch
    ])

    // Step 5: Subtle paper texture
    let paper = makePaperTexture(extent: extent, amount: strength)
    sketch = sketch.applyingFilter("CIMultiplyBlendMode", parameters: [
      kCIInputBackgroundImageKey: paper
    ])

    // Step 6: Final tone curve for punch (clean whites + rich darks)
    return sketch
      .applyingFilter("CIToneCurve", parameters: [
        "inputPoint0": CIVector(x: 0, y: 0),
        "inputPoint1": CIVector(x: 0.2, y: 0.05),
        "inputPoint2": CIVector(x: 0.5, y: 0.55),
        "inputPoint3": CIVector(x: 0.8, y: 0.95),
        "inputPoint4": CIVector(x: 1, y: 1)
      ])
      .applyingFilter("CIColorControls", parameters: [
        kCIInputSaturationKey: 0
      ])
  }

  private func makePaperTexture(extent: CGRect, amount: CGFloat) -> CIImage {
    // Warm white base
    let basePaper = CIImage(color: CIColor(red: 0.98, green: 0.97, blue: 0.95, alpha: 1)).cropped(to: extent)
    guard let noise = CIFilter(name: "CIRandomGenerator")?.outputImage?.cropped(to: extent) else {
      return basePaper
    }

    // Very subtle grain only — no fiber texture
    let grain = noise
      .applyingFilter("CIColorControls", parameters: [
        kCIInputSaturationKey: 0,
        kCIInputContrastKey: 0.8 + amount * 0.3,
        kCIInputBrightnessKey: 0.2
      ])
      .applyingFilter("CIColorMatrix", parameters: [
        "inputRVector": CIVector(x: 0.04, y: 0, z: 0, w: 0),
        "inputGVector": CIVector(x: 0, y: 0.04, z: 0, w: 0),
        "inputBVector": CIVector(x: 0, y: 0, z: 0.04, w: 0),
        "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 0.06 + amount * 0.04)
      ])

    return grain.applyingFilter("CISourceOverCompositing", parameters: [
      kCIInputBackgroundImageKey: basePaper
    ])
  }

  private func makeCrossHatchTexture(extent: CGRect, amount: CGFloat, center: CIVector, darknessMask: CIImage) -> CIImage {
    let transparent = CIImage(color: CIColor(red: 0, green: 0, blue: 0, alpha: 0)).cropped(to: extent)

    let diagonalA = transparent
      .applyingFilter("CILineScreen", parameters: [
        kCIInputCenterKey: center,
        "inputAngle": 0.78,
        "inputWidth": 7.5 - amount * 2.6,
        "inputSharpness": 0.92
      ])
      .cropped(to: extent)

    let diagonalB = transparent
      .applyingFilter("CILineScreen", parameters: [
        kCIInputCenterKey: center,
        "inputAngle": -0.74,
        "inputWidth": 9.0 - amount * 3.1,
        "inputSharpness": 0.88
      ])
      .cropped(to: extent)

    let rawHatch = diagonalA
      .applyingFilter("CIMultiplyBlendMode", parameters: [
        kCIInputBackgroundImageKey: diagonalB
      ])
      .applyingFilter("CIColorControls", parameters: [
        kCIInputSaturationKey: 0,
        kCIInputContrastKey: 1.7,
        kCIInputBrightnessKey: 0.2
      ])

    // Apply darkness mask: hatching only in dark/mid areas
    // Invert hatch (dark lines become light), multiply with mask, invert back
    let hatchInverted = rawHatch.applyingFilter("CIColorInvert")
    let masked = hatchInverted.applyingFilter("CIMultiplyBlendMode", parameters: [
      kCIInputBackgroundImageKey: darknessMask
    ])
    let hatchMasked = masked.applyingFilter("CIColorInvert")

    return hatchMasked.applyingFilter("CIColorMatrix", parameters: [
      "inputRVector": CIVector(x: 0.14, y: 0, z: 0, w: 0),
      "inputGVector": CIVector(x: 0, y: 0.14, z: 0, w: 0),
      "inputBVector": CIVector(x: 0, y: 0, z: 0.14, w: 0),
      "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 0.14 + amount * 0.08)
    ])
  }
}

@objc(RNMediaPipeline)
class RNMediaPipeline: NSObject, RCTBridgeModule {
  static func moduleName() -> String! {
    "RNMediaPipeline"
  }

  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(importAsset:kind:resolver:rejecter:)
  func importAsset(
    _ inputPath: String,
    kind: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      let url = NativeImageIO.normalizeURL(inputPath)
      var width: CGFloat = 0
      var height: CGFloat = 0
      var durationMs: Int = 0

      if kind == "video" || kind == "livePhoto" {
        let asset = AVAsset(url: url)
        durationMs = Int(CMTimeGetSeconds(asset.duration) * 1000)
        if let track = asset.tracks(withMediaType: .video).first {
          let natural = track.naturalSize.applying(track.preferredTransform)
          width = abs(natural.width)
          height = abs(natural.height)
        }
      } else if let image = UIImage(contentsOfFile: url.path) {
        width = image.size.width
        height = image.size.height
      }

      resolve([
        "id": UUID().uuidString,
        "kind": kind,
        "uri": url.path,
        "width": width,
        "height": height,
        "durationMs": durationMs > 0 ? durationMs : NSNull(),
        "createdAt": ISO8601DateFormatter().string(from: Date())
      ])
    }
  }

  @objc(exportAsset:outputKind:quality:resolver:rejecter:)
  func exportAsset(
    _ inputPath: String,
    outputKind: String,
    quality: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let inputURL = NativeImageIO.normalizeURL(inputPath)
        if outputKind == "video" {
          self.transcodeVideo(inputPath, preset: "high", resolver: resolve, rejecter: reject)
          return
        }
        if outputKind == "gif" {
          self.encodeGif(inputPath, fps: 12, resolver: resolve, rejecter: reject)
          return
        }
        guard let image = UIImage(contentsOfFile: inputURL.path) else {
          throw NSError(domain: "RNMediaPipeline", code: 2001, userInfo: [NSLocalizedDescriptionKey: "Input image is unavailable"])
        }
        let destination = NativeImageIO.tempURL("jpg")
        guard let data = image.jpegData(compressionQuality: CGFloat(truncating: quality)) else {
          throw NSError(domain: "RNMediaPipeline", code: 2002, userInfo: [NSLocalizedDescriptionKey: "Failed to encode image"])
        }
        try data.write(to: destination)
        resolve(["uri": destination.path])
      } catch {
        reject("export_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(transcodeVideo:preset:resolver:rejecter:)
  func transcodeVideo(
    _ inputPath: String,
    preset: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let inputURL = NativeImageIO.normalizeURL(inputPath)
    let asset = AVAsset(url: inputURL)
    let presetName = preset == "medium" ? AVAssetExportPreset1280x720 : AVAssetExportPresetHighestQuality
    guard let export = AVAssetExportSession(asset: asset, presetName: presetName) else {
      reject("transcode_init_failed", "Unable to initialize transcode session", nil)
      return
    }
    let outputURL = NativeImageIO.tempURL("mp4")
    try? FileManager.default.removeItem(at: outputURL)
    export.outputURL = outputURL
    export.outputFileType = .mp4
    export.shouldOptimizeForNetworkUse = true
    export.exportAsynchronously {
      switch export.status {
      case .completed:
        resolve(["uri": outputURL.path])
      case .failed, .cancelled:
        reject("transcode_failed", export.error?.localizedDescription ?? "Transcode failed", export.error)
      default:
        break
      }
    }
  }

  @objc(composeLivePhoto:videoPath:resolver:rejecter:)
  func composeLivePhoto(
    _ imagePath: String,
    videoPath: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let imageURL = NativeImageIO.normalizeURL(imagePath)
    let videoURL = NativeImageIO.normalizeURL(videoPath)
    resolve([
      "uri": imageURL.path,
      "pairedVideoUri": videoURL.path
    ])
  }

  @objc(encodeGif:fps:resolver:rejecter:)
  func encodeGif(
    _ inputPath: String,
    fps: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      let inputURL = NativeImageIO.normalizeURL(inputPath)
      if inputURL.pathExtension.lowercased() == "gif" {
        let copyURL = NativeImageIO.tempURL("gif")
        try? FileManager.default.removeItem(at: copyURL)
        do {
          try FileManager.default.copyItem(at: inputURL, to: copyURL)
          resolve(["uri": copyURL.path])
        } catch {
          reject("gif_copy_failed", error.localizedDescription, error)
        }
        return
      }
      guard let image = UIImage(contentsOfFile: inputURL.path)?.cgImage else {
        reject("gif_encode_failed", "Could not load source image", nil)
        return
      }
      let outputURL = NativeImageIO.tempURL("gif")
      guard let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.gif.identifier as CFString, 1, nil) else {
        reject("gif_encode_failed", "Could not initialize GIF destination", nil)
        return
      }
      let frameDelay = max(0.02, 1.0 / Double(truncating: fps))
      let frameProps: [CFString: Any] = [
        kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFDelayTime: frameDelay]
      ]
      let gifProps: [CFString: Any] = [
        kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFLoopCount: 0]
      ]
      CGImageDestinationSetProperties(destination, gifProps as CFDictionary)
      CGImageDestinationAddImage(destination, image, frameProps as CFDictionary)
      if CGImageDestinationFinalize(destination) {
        resolve(["uri": outputURL.path])
      } else {
        reject("gif_encode_failed", "Failed to finalize GIF", nil)
      }
    }
  }
}

@objc(RNAIEffects)
class RNAIEffects: NSObject, RCTBridgeModule {
  static func moduleName() -> String! {
    "RNAIEffects"
  }

  static func requiresMainQueueSetup() -> Bool {
    false
  }

  private let ciContext = CIContext()

  @objc(segmentSubject:resolver:rejecter:)
  func segmentSubject(
    _ inputPath: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let inputURL = NativeImageIO.normalizeURL(inputPath)
        guard let sourceImage = CIImage(contentsOf: inputURL, options: [.applyOrientationProperty: true]) else {
          throw NSError(domain: "RNAIEffects", code: 3001, userInfo: [NSLocalizedDescriptionKey: "Unable to load image for segmentation"])
        }
        let request = VNGeneratePersonSegmentationRequest()
        request.qualityLevel = .balanced
        request.outputPixelFormat = kCVPixelFormatType_OneComponent8
        let handler = VNImageRequestHandler(ciImage: sourceImage)
        try handler.perform([request])
        guard let maskBuffer = request.results?.first?.pixelBuffer else {
          throw NSError(domain: "RNAIEffects", code: 3002, userInfo: [NSLocalizedDescriptionKey: "Segmentation mask not generated"])
        }
        var maskImage = CIImage(cvPixelBuffer: maskBuffer)
        let sx = sourceImage.extent.width / maskImage.extent.width
        let sy = sourceImage.extent.height / maskImage.extent.height
        maskImage = maskImage
          .transformed(by: CGAffineTransform(scaleX: sx, y: sy))
          .cropped(to: sourceImage.extent)
        let maskURL = NativeImageIO.tempURL("png")
        try self.writePNG(maskImage, to: maskURL)
        resolve(["maskUri": maskURL.path])
      } catch {
        reject("segment_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(removeBackground:maskPath:resolver:rejecter:)
  func removeBackground(
    _ inputPath: String,
    maskPath: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let inputURL = NativeImageIO.normalizeURL(inputPath)
        guard let image = CIImage(contentsOf: inputURL, options: [.applyOrientationProperty: true]) else {
          throw NSError(domain: "RNAIEffects", code: 3003, userInfo: [NSLocalizedDescriptionKey: "Input image unavailable"])
        }
        let maskURL: URL
        if let maskPath {
          maskURL = NativeImageIO.normalizeURL(maskPath)
        } else {
          let semaphore = DispatchSemaphore(value: 0)
          var generatedMaskPath: String?
          self.segmentSubject(inputPath, resolver: { result in
            if let dictionary = result as? [String: Any], let maskUri = dictionary["maskUri"] as? String {
              generatedMaskPath = maskUri
            }
            semaphore.signal()
          }, rejecter: { _, _, _ in
            semaphore.signal()
          })
          semaphore.wait()
          guard let generatedMaskPath else {
            throw NSError(domain: "RNAIEffects", code: 3004, userInfo: [NSLocalizedDescriptionKey: "Unable to generate mask"])
          }
          maskURL = NativeImageIO.normalizeURL(generatedMaskPath)
        }
        guard let maskImage = CIImage(contentsOf: maskURL, options: [.applyOrientationProperty: true]) else {
          throw NSError(domain: "RNAIEffects", code: 3005, userInfo: [NSLocalizedDescriptionKey: "Mask image unavailable"])
        }
        let transparentBackground = CIImage(color: CIColor(red: 0, green: 0, blue: 0, alpha: 0)).cropped(to: image.extent)
        let composited = image.applyingFilter(
          "CIBlendWithMask",
          parameters: [
            kCIInputMaskImageKey: maskImage,
            kCIInputBackgroundImageKey: transparentBackground
          ]
        )
        let outputURL = NativeImageIO.tempURL("png")
        try self.writePNG(composited, to: outputURL)
        resolve([
          "outputUri": outputURL.path,
          "maskUri": maskURL.path
        ])
      } catch {
        reject("remove_bg_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(upscaleImage:scale:resolver:rejecter:)
  func upscaleImage(
    _ inputPath: String,
    scale: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let inputURL = NativeImageIO.normalizeURL(inputPath)
        guard let image = CIImage(contentsOf: inputURL, options: [.applyOrientationProperty: true]) else {
          throw NSError(domain: "RNAIEffects", code: 3006, userInfo: [NSLocalizedDescriptionKey: "Input image unavailable"])
        }
        let scaled = image.applyingFilter(
          "CILanczosScaleTransform",
          parameters: [
            kCIInputScaleKey: CGFloat(truncating: scale),
            kCIInputAspectRatioKey: 1.0
          ]
        )
        let outputURL = NativeImageIO.tempURL("jpg")
        try self.writeJPEG(scaled, to: outputURL)
        resolve(["outputUri": outputURL.path])
      } catch {
        reject("upscale_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(applyMask:maskPath:backgroundHex:resolver:rejecter:)
  func applyMask(
    _ inputPath: String,
    maskPath: String,
    backgroundHex: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let imageURL = NativeImageIO.normalizeURL(inputPath)
        let maskURL = NativeImageIO.normalizeURL(maskPath)
        guard let image = CIImage(contentsOf: imageURL, options: [.applyOrientationProperty: true]),
              let mask = CIImage(contentsOf: maskURL, options: [.applyOrientationProperty: true]) else {
          throw NSError(domain: "RNAIEffects", code: 3007, userInfo: [NSLocalizedDescriptionKey: "Invalid image or mask"])
        }
        let bgColor = self.color(fromHex: backgroundHex)
        let background = CIImage(color: bgColor).cropped(to: image.extent)
        let composited = image.applyingFilter(
          "CIBlendWithMask",
          parameters: [
            kCIInputMaskImageKey: mask,
            kCIInputBackgroundImageKey: background
          ]
        )
        let outputURL = NativeImageIO.tempURL("jpg")
        try self.writeJPEG(composited, to: outputURL)
        resolve(["outputUri": outputURL.path])
      } catch {
        reject("apply_mask_failed", error.localizedDescription, error)
      }
    }
  }

  private func writePNG(_ image: CIImage, to url: URL) throws {
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    guard let data = ciContext.pngRepresentation(of: image, format: .RGBA8, colorSpace: colorSpace) else {
      throw NSError(domain: "RNAIEffects", code: 3010, userInfo: [NSLocalizedDescriptionKey: "Failed to encode PNG"])
    }
    try data.write(to: url)
  }

  private func writeJPEG(_ image: CIImage, to url: URL) throws {
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    guard let data = ciContext.jpegRepresentation(of: image, colorSpace: colorSpace, options: [:]) else {
      throw NSError(domain: "RNAIEffects", code: 3011, userInfo: [NSLocalizedDescriptionKey: "Failed to encode JPEG"])
    }
    try data.write(to: url)
  }

  private func color(fromHex hex: String) -> CIColor {
    let cleaned = hex.replacingOccurrences(of: "#", with: "")
    guard cleaned.count == 6, let value = Int(cleaned, radix: 16) else {
      return CIColor(red: 0, green: 0, blue: 0, alpha: 1)
    }
    let red = CGFloat((value >> 16) & 0xFF) / 255.0
    let green = CGFloat((value >> 8) & 0xFF) / 255.0
    let blue = CGFloat(value & 0xFF) / 255.0
    return CIColor(red: red, green: green, blue: blue, alpha: 1.0)
  }
}
