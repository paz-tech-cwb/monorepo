package br.church.paz.shared.push

// iOS gets the FCM token natively via Messaging.messaging().token() in Swift (spec §7.2).
// The shared expect/actual is only used by Android; this actual is never called from iOS code.
actual suspend fun getFcmToken(): String? = null
