package br.church.paz.android

import android.app.Application
import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import br.church.paz.android.di.androidModule
import br.church.paz.android.notifications.PazFirebaseMessagingService
import br.church.paz.shared.di.sharedModules
import br.church.paz.shared.media.VideoCache
import com.chuckerteam.chucker.api.ChuckerCollector
import com.chuckerteam.chucker.api.ChuckerInterceptor
import com.chuckerteam.chucker.api.RetentionManager
import com.cwb.pazchurch.app.BuildConfig
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.HttpClientEngineFactory
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.engine.okhttp.OkHttpConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin
import org.koin.dsl.module

// Must be top-level: the delegate is an extension property on Context
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "paz_prefs")

class PazApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // Create notification channels eagerly: background/killed-state FCM messages that
        // carry a top-level `notification` block are rendered natively by the FCM SDK and
        // never reach PazFirebaseMessagingService.onMessageReceived(), so the channels (and
        // the manifest-declared default fallback) must already exist before the first push.
        PazFirebaseMessagingService.ensureChannels(applicationContext)

        startKoin {
            androidContext(this@PazApplication)
            properties(
                mapOf(
                    "BASE_URL" to BuildConfig.BASE_URL,
                    "DEBUG" to BuildConfig.DEBUG.toString(),
                ),
            )
            modules(
                sharedModules +
                    module {
                        single { androidContext().dataStore }
                        // Chucker interceptor requires the OkHttp engine (CIO has no
                        // OkHttp client to hook into) — see kmp-mobile/CLAUDE.md. Koin
                        // binding shape (HttpClientEngineFactory<*>) is unchanged so
                        // nothing else in the DI graph (createPazHttpClient) needs to
                        // know which engine is behind it.
                        single<HttpClientEngineFactory<*>> {
                            val context = androidContext()
                            object : HttpClientEngineFactory<OkHttpConfig> {
                                override fun create(block: OkHttpConfig.() -> Unit): HttpClientEngine =
                                    OkHttp.create {
                                        addInterceptor(
                                            ChuckerInterceptor
                                                .Builder(context)
                                                // Never show a status-bar notification and
                                                // never retain captured traffic longer than an
                                                // hour. Without an explicit collector, Chucker
                                                // defaults to showNotification = true (pushing
                                                // a notification — and the full inspector —
                                                // to every user on every request) and a
                                                // one-week retention window, both of which can
                                                // leak PII (via Android Auto Backup sweeping
                                                // Chucker's database, since allowBackup=true)
                                                // far beyond the intended admin/pastor-gated
                                                // inspector flow.
                                                .collector(
                                                    ChuckerCollector(
                                                        context = context,
                                                        showNotification = false,
                                                        retentionPeriod = RetentionManager.Period.ONE_HOUR,
                                                    ),
                                                )
                                                // Both auth/refresh (response) and
                                                // auth/social-login (request idToken +
                                                // response access/refresh tokens) carry live
                                                // tokens. Exclude them from capture entirely
                                                // via Chucker's own mechanism rather than
                                                // relying on Ktor-level header sanitization
                                                // (which does not cover response bodies) —
                                                // see the note in PazHttpClient.kt.
                                                .skipPaths(Regex(".*auth/(refresh|social-login).*"))
                                                // The Authorization header carries the live
                                                // Bearer access token on every request; redact
                                                // it so it never appears in the inspector UI.
                                                .redactHeaders("Authorization")
                                                .createShortcut(false)
                                                .build(),
                                        )
                                        block()
                                    }
                            }
                        }
                    } +
                    androidModule,
            )
        }

        // Prefetch the onboarding welcome video as soon as the app process starts — well before
        // any sign-in — so it plays instantly once a member reaches that step instead of
        // stalling on a live stream. Koin must already be started (context.cacheDir access goes
        // through it), and this scope deliberately outlives any single Activity/ViewModel.
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            VideoCache.prefetch(BuildConfig.ONBOARDING_VIDEO_URL)
        }
    }
}
