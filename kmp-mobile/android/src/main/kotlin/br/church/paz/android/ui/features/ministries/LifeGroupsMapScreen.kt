package br.church.paz.android.ui.features.ministries

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazMeshBackground

/**
 * Placeholder for the Life Groups map view. The real Google Maps
 * implementation (pins for each [br.church.paz.shared.domain.model.LifeGroup]
 * with `latitude`/`longitude`) lands in the next pass — this exists only so
 * the `Screen.LifeGroupsMap` route compiles and navigates correctly.
 *
 * TODO(Step 6b): replace with the real Google Maps implementation.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupsMapScreen(navController: NavController) {
    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                LargeTopAppBar(
                    title = { Text("Mapa") },
                    navigationIcon = {
                        IconButton(onClick = { navController.popBackStack() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "back")
                        }
                    },
                    colors = TopAppBarDefaults.largeTopAppBarColors(containerColor = Color.Transparent),
                )
            },
            containerColor = Color.Transparent,
        ) { innerPadding ->
            Box(
                Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding()),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "Visualização em mapa em breve",
                    style =
                        MaterialTheme.typography.bodyMedium.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        ),
                )
            }
        }
    }
}
