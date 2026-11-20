package com.example

import android.content.pm.ActivityInfo
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.data.VizagDatabase
import com.example.data.VizagGameRepository
import com.example.ui.VizagOpenWorldScreen
import com.example.ui.theme.VizagCityTheme
import com.example.viewmodel.GameViewModel

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
    enableEdgeToEdge()
    configureImmersiveLandscapeBars()

    val database = VizagDatabase.getInstance(applicationContext)
    val repository = VizagGameRepository(database.saveDao())

    setContent {
      VizagCityTheme {
        Scaffold(
          modifier = Modifier.fillMaxSize(),
          contentWindowInsets = WindowInsets(0.dp, 0.dp, 0.dp, 0.dp),
        ) { innerPadding ->
          val gameViewModel: GameViewModel =
            viewModel(factory = GameViewModel.Factory(repository))
          VizagOpenWorldScreen(
            viewModel = gameViewModel,
            modifier = Modifier.fillMaxSize().padding(innerPadding),
          )
        }
      }
    }
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      configureImmersiveLandscapeBars()
    }
  }

  private fun configureImmersiveLandscapeBars() {
    val controller = WindowCompat.getInsetsController(window, window.decorView)
    controller.systemBarsBehavior =
      WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    controller.hide(WindowInsetsCompat.Type.systemBars())
  }
}
