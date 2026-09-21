package br.church.paz.android.auth

import android.annotation.SuppressLint
import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.tasks.await

/**
 * Wraps the Credential Manager API for Google Sign-In.
 * Returns a Firebase ID token (not the raw Google ID token) so the backend
 * can verify it with Firebase Admin SDK's verifyIdToken().
 */
@SuppressLint("CredentialManagerSignInWithGoogle") // Already uses GoogleIdTokenCredential.createFrom()
class GoogleSignInHelper(
    private val context: Context,
) {
    private val credentialManager = CredentialManager.create(context)

    suspend fun getIdToken(webClientId: String): Result<String> {
        return try {
            val option =
                GetGoogleIdOption
                    .Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(webClientId)
                    .setAutoSelectEnabled(true)
                    .build()

            val request =
                GetCredentialRequest
                    .Builder()
                    .addCredentialOption(option)
                    .build()

            val result = credentialManager.getCredential(context = context, request = request)
            val googleCredential = GoogleIdTokenCredential.createFrom(result.credential.data)

            // Exchange the Google ID token for a Firebase ID token — the backend
            // calls admin.auth().verifyIdToken() which requires a Firebase token.
            val firebaseCredential = GoogleAuthProvider.getCredential(googleCredential.idToken, null)
            val authResult = FirebaseAuth.getInstance().signInWithCredential(firebaseCredential).await()
            val firebaseIdToken =
                authResult.user
                    ?.getIdToken(false)
                    ?.await()
                    ?.token
                    ?: return Result.failure(Exception("Falha ao obter token do Firebase."))

            Result.success(firebaseIdToken)
        } catch (e: NoCredentialException) {
            // Distinct from a real user cancellation — the device has no Google account
            // to pick from. Must not contain "cancel" or LoginScreen's cancel-filter
            // (`e.message?.contains("cancel", ...)`) would silently swallow this and the
            // button would appear to do nothing.
            Result.failure(Exception("Nenhuma conta Google encontrada neste dispositivo. Adicione uma conta em Configurações."))
        } catch (e: GetCredentialCancellationException) {
            Result.failure(e) // real user cancellation — message contains "cancel", filtered by LoginScreen
        } catch (e: GetCredentialException) {
            Result.failure(e)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
