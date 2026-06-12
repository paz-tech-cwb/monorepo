import Foundation
import Security
import Shared

/// Bridges the shared module's `PlatformKeychain` to the native Swift Keychain API.
/// Injected into the shared module at app startup (see PazChurchApp.init).
final class KmpKeychainBridge: PlatformKeychain {
    private let keychain = KeychainService.shared

    func set(key: String, value: String) {
        try? keychain.save(token: value, key: key)
    }

    func get(key: String) -> String? {
        try? keychain.retrieve(key: key)
    }

    func remove(key: String) {
        try? keychain.delete(key: key)
    }
}

class KeychainService {
    static let shared = KeychainService()

    private let service = "br.church.paz.mobile"

    func save(token: String, key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: token.data(using: .utf8)!,
        ]

        SecItemDelete(query as CFDictionary)

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }

    func retrieve(key: String) throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status != errSecItemNotFound else {
            return nil
        }

        guard status == errSecSuccess else {
            throw KeychainError.retrieveFailed(status)
        }

        guard let data = result as? Data, let token = String(data: data, encoding: .utf8) else {
            throw KeychainError.decodeFailed
        }

        return token
    }

    func delete(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]

        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteFailed(status)
        }
    }
}

enum KeychainError: LocalizedError {
    case saveFailed(OSStatus)
    case retrieveFailed(OSStatus)
    case decodeFailed
    case deleteFailed(OSStatus)

    var errorDescription: String? {
        switch self {
        case let .saveFailed(status):
            "Failed to save to Keychain: \(status)"

        case let .retrieveFailed(status):
            "Failed to retrieve from Keychain: \(status)"

        case .decodeFailed:
            "Failed to decode token from Keychain"

        case let .deleteFailed(status):
            "Failed to delete from Keychain: \(status)"
        }
    }
}
