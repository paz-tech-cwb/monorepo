package br.church.paz.shared.push

import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await

actual suspend fun getFcmToken(): String? = runCatching {
    FirebaseMessaging.getInstance().token.await()
}.getOrNull()
