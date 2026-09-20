package br.church.paz.android

import android.app.Application
import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import br.church.paz.android.di.androidModule
import br.church.paz.shared.di.sharedModules
import br.church.paz.shared.media.VideoCache
import com.cwb.pazchurch.app.BuildConfig
import io.ktor.client.engine.cio.CIO
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
                        single<io.ktor.client.engine.HttpClientEngineFactory<*>> { CIO }
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
