package br.church.paz.android.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import com.google.firebase.auth.OAuthProvider

/**
 * Wraps Apple Sign-In via Firebase OAuthProvider + Credential Manager.
 *
 * Note: Apple Sign-In on Android goes through Firebase's OIDC flow
 * (not the native Apple SDK). The result is an OAuthCredential that
 * is used to sign into Firebase, giving us the Firebase ID token.
 */
class AppleSignInHelper(private val context: Context) {

    private val credentialManager = CredentialManager.create(context)

    /**
     * Returns the Firebase ID token after a successful Apple sign-in.
     * Callers should pass this to AuthRepository.socialLogin(provider = "apple").
     */
    suspend fun getIdToken(): Result<String> {
        return try {
            val provider = OAuthProvider.newBuilder("apple.com")
                .setScopes(listOf("email", "name"))
                .build()

            // Firebase handles the Apple OAuth redirect internally on Android.
            // The Credential Manager integration surfaces it as a CustomCredential.
            // For now return a placeholder — full Firebase OAuthProvider sign-in
            // requires an Activity context and uses startActivityForResult flow.
            // This will be completed in the LoginScreen using FirebaseAuth directly.
            Result.failure(UnsupportedOperationException("Use FirebaseAuth.startActivityForSignInWithProvider"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
