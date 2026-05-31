package br.church.paz.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import br.church.paz.android.navigation.PazNavGraph
import br.church.paz.android.ui.theme.PazTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PazTheme {
                PazNavGraph()
            }
        }
    }
}
