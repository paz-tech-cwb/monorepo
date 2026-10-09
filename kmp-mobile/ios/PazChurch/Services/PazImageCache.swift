import Foundation
import Kingfisher

/// One-time configuration of Kingfisher's shared `ImageCache` for the whole app.
///
/// All `KFImage` call sites across the app already go through `ImageCache.default`
/// implicitly, so this just tunes its limits/expiry once at startup rather than
/// leaving it on Kingfisher's own (looser) defaults.
enum PazImageCache {
    static func configure() {
        let cache = ImageCache.default

        // Memory cache: fast, in-process, cleared on background/termination.
        cache.memoryStorage.config.totalCostLimit = 100 * 1024 * 1024 // ~100 MB
        cache.memoryStorage.config.expiration = .seconds(60 * 5) // 5 minutes

        // Disk cache: persists across launches.
        cache.diskStorage.config.sizeLimit = 300 * 1024 * 1024 // ~300 MB
        cache.diskStorage.config.expiration = .days(7)
    }
}
