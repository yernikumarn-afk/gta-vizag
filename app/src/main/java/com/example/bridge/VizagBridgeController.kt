package com.example.bridge

import android.webkit.JavascriptInterface
import android.webkit.WebView
import java.util.Locale

class VizagBridgeController(
  private val onEngineReadyCallback: () -> Unit,
  private val onTelemetryCallback: (String) -> Unit,
  private val onMissionCompletedCallback: (Int, Int) -> Unit,
  private val onNotificationCallback: (String) -> Unit,
  private val onAssetManifestCallback: (String) -> Unit,
  private val onGisStateChangedCallback: (String) -> Unit = {},
) {
  @Volatile private var webViewRef: WebView? = null

  fun attachWebView(webView: WebView) {
    webViewRef = webView
  }

  fun detachWebView() {
    webViewRef = null
  }

  private fun evalJs(script: String) {
    val wv = webViewRef ?: return
    wv.post { wv.evaluateJavascript(script, null) }
  }

  fun setJoystick(x: Float, y: Float) {
    val sx = String.format(Locale.US, "%.3f", x)
    val sy = String.format(Locale.US, "%.3f", y)
    evalJs("window.VizagGame && window.VizagGame.setJoystick($sx, $sy);")
  }

  fun addCameraDelta(dx: Float, dy: Float) {
    val sdx = String.format(Locale.US, "%.4f", dx)
    val sdy = String.format(Locale.US, "%.4f", dy)
    evalJs("window.VizagGame && window.VizagGame.addCameraDelta($sdx, $sdy);")
  }

  fun triggerJump() {
    evalJs("window.VizagGame && window.VizagGame.jump();")
  }

  fun setSprint(active: Boolean) {
    evalJs("window.VizagGame && window.VizagGame.setSprint($active);")
  }

  fun triggerInteract() {
    evalJs("window.VizagGame && window.VizagGame.interact();")
  }

  fun toggleVehicle() {
    evalJs("window.VizagGame && window.VizagGame.toggleVehicle();")
  }

  fun setDrivingControls(throttle: Float, brake: Float, reverse: Float, handbrake: Float) {
    val st = String.format(Locale.US, "%.2f", throttle)
    val sb = String.format(Locale.US, "%.2f", brake)
    val sr = String.format(Locale.US, "%.2f", reverse)
    val sh = String.format(Locale.US, "%.2f", handbrake)
    evalJs("window.VizagGame && window.VizagGame.setDrivingControls($st, $sb, $sr, $sh);")
  }

  fun honkHorn() {
    evalJs("window.VizagGame && window.VizagGame.honkHorn();")
  }

  fun spawnGarageVehicle(vehicleId: String) {
    val safeId = vehicleId.replace("'", "")
    evalJs("window.VizagGame && window.VizagGame.spawnVehicle('$safeId');")
  }

  fun setPaused(paused: Boolean) {
    evalJs("window.VizagGame && window.VizagGame.setPaused($paused);")
  }

  fun setAudioEnabled(enabled: Boolean) {
    evalJs("window.VizagGame && window.VizagGame.setAudioEnabled($enabled);")
  }

  fun setAudioVolume(volume: Float) {
    val sv = String.format(Locale.US, "%.2f", volume.coerceIn(0f, 1f))
    evalJs("window.VizagGame && window.VizagGame.setAudioVolume($sv);")
  }

  fun applyGraphicsPreset(presetName: String) {
    evalJs("window.VizagGame && window.VizagGame.applyGraphicsPreset('$presetName');")
  }

  fun applyCustomGraphics(
    resolutionScale: Float,
    shadowsEnabled: Boolean,
    drawDistance: Float,
    targetFps: Int,
    shadowMapSize: Int = 1024,
    anisotropy: Int = 2,
    antiAliasing: Boolean = true,
  ) {
    val sr = String.format(Locale.US, "%.2f", resolutionScale)
    val sd = String.format(Locale.US, "%.0f", drawDistance)
    evalJs(
      "window.VizagGame && window.VizagGame.applyCustomGraphics($sr, $shadowsEnabled, $sd, $targetFps, $shadowMapSize, $anisotropy, $antiAliasing);"
    )
  }

  fun setTimeOfDay(hour: Float, autoCycle: Boolean) {
    val sh = String.format(Locale.US, "%.2f", hour)
    evalJs("window.VizagGame && window.VizagGame.setEnvironmentTime($sh, $autoCycle);")
  }

  fun setWeather(weatherKey: String) {
    evalJs("window.VizagGame && window.VizagGame.setWeather('$weatherKey');")
  }

  fun setCustomWaypoint(x: Float, z: Float, label: String) {
    val safeLabel = label.replace("'", "\\'")
    val sx = String.format(Locale.US, "%.1f", x)
    val sz = String.format(Locale.US, "%.1f", z)
    evalJs("window.VizagGame && window.VizagGame.setCustomWaypoint($sx, $sz, '$safeLabel');")
  }

  fun teleportPlayer(x: Float, z: Float, yaw: Float = 3.14f) {
    val sx = String.format(Locale.US, "%.1f", x)
    val sz = String.format(Locale.US, "%.1f", z)
    val syaw = String.format(Locale.US, "%.2f", yaw)
    evalJs("window.VizagGame && window.VizagGame.teleportTo($sx, $sz, $syaw);")
  }

  fun selectMission(missionIndex: Int) {
    evalJs("window.VizagGame && window.VizagGame.setActiveMission($missionIndex);")
  }

  fun applySavedWorldState(
    x: Float,
    z: Float,
    yaw: Float,
    timeOfDay: Float,
    autoCycle: Boolean,
    weatherKey: String,
    missionIndex: Int,
  ) {
    val sx = String.format(Locale.US, "%.2f", x)
    val sz = String.format(Locale.US, "%.2f", z)
    val sy = String.format(Locale.US, "%.2f", yaw)
    val st = String.format(Locale.US, "%.2f", timeOfDay)
    evalJs(
      "window.VizagGame && window.VizagGame.restoreState($sx, $sz, $sy, $st, $autoCycle, '$weatherKey', $missionIndex);"
    )
  }

  @JavascriptInterface
  fun onEngineReady() {
    onEngineReadyCallback()
  }

  @JavascriptInterface
  fun onTelemetry(jsonPayload: String) {
    onTelemetryCallback(jsonPayload)
  }

  @JavascriptInterface
  fun onMissionCompleted(missionIndex: Int, rewardRupees: Int) {
    onMissionCompletedCallback(missionIndex, rewardRupees)
  }

  @JavascriptInterface
  fun onNotification(message: String) {
    onNotificationCallback(message)
  }

  fun setGisLayerVisibility(layerId: String, visible: Boolean) {
    val safeId = layerId.replace("'", "")
    evalJs("window.VizagGame && window.VizagGame.setGisLayerVisibility('$safeId', $visible);")
  }

  fun importGisAsset(url: String, fileName: String, layerHint: String = "auto") {
    val safeUrl = url.replace("'", "\\'")
    val safeName = fileName.replace("'", "\\'")
    val safeHint = layerHint.replace("'", "\\'")
    evalJs("window.VizagGame && window.VizagGame.importGisAsset('$safeUrl', '$safeName', '$safeHint');")
  }

  @JavascriptInterface
  fun onAssetManifest(jsonPayload: String) {
    onAssetManifestCallback(jsonPayload)
  }

  @JavascriptInterface
  fun onGisStateChanged(jsonPayload: String) {
    onGisStateChangedCallback(jsonPayload)
  }
}
