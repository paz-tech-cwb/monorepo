package br.church.paz.android

import android.app.Application
import androidx.datastore.preferences.preferencesDataStore
import br.church.paz.android.di.androidModule
import br.church.paz.shared.di.sharedModules
import io.ktor.client.engine.cio.CIO
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin
import org.koin.dsl.module

class PazApplication : Application() {

    private val dataStore by preferencesDataStore(name = "paz_prefs")

    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@PazApplication)
            properties(mapOf(
                "BASE_URL" to BuildConfig.BASE_URL,
                "DEBUG"    to BuildConfig.DEBUG.toString(),
            ))
            modules(
                sharedModules +
                module { single { dataStore }; single { CIO } } +
                androidModule
            )
        }
    }
}
