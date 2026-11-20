package com.example.ui.components

import android.annotation.SuppressLint
import android.net.Uri
import android.os.Build
import android.view.ViewGroup
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.viewinterop.AndroidView
import com.example.bridge.VizagBridgeController
import java.io.ByteArrayInputStream
import java.io.File

@SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
@Composable
fun VizagWebGLView(
  bridge: VizagBridgeController,
  modifier: Modifier = Modifier,
) {
  DisposableEffect(bridge) {
    onDispose { bridge.detachWebView() }
  }

  AndroidView(
    modifier = modifier.testTag("webgl_viewport"),
    factory = { context ->
      WebView(context).apply {
        layoutParams =
          ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
          )
        setBackgroundColor(android.graphics.Color.rgb(9, 19, 31))
        isVerticalScrollBarEnabled = false
        isHorizontalScrollBarEnabled = false
        isFocusable = false
        isClickable = false
        // Let Jetpack Compose multi-touch overlays handle all touch gestures cleanly
        setOnTouchListener { _, _ -> true }

        settings.apply {
          javaScriptEnabled = true
          domStorageEnabled = true
          mediaPlaybackRequiresUserGesture = false
          cacheMode = WebSettings.LOAD_DEFAULT
          allowFileAccess = false
          allowContentAccess = false
        }

        addJavascriptInterface(bridge, "AndroidBridge")

        webViewClient =
          object : WebViewClient() {
            override fun shouldInterceptRequest(
              view: WebView?,
              request: WebResourceRequest?,
            ): WebResourceResponse? {
              val url = request?.url ?: return null
              if (url.host == "vizag.local") {
                val rawPath = url.path?.removePrefix("/") ?: ""
                if (rawPath.startsWith("imports/")) {
                  val importsDir = File(context.filesDir, "gis_imports")
                  val relativeName = rawPath.removePrefix("imports/")
                  val targetFile = File(importsDir, relativeName)
                  val canonicalDir = runCatching { importsDir.canonicalPath }.getOrNull()
                  val canonicalTarget = runCatching { targetFile.canonicalPath }.getOrNull()
                  if (
                    canonicalDir != null &&
                      canonicalTarget != null &&
                      canonicalTarget.startsWith(canonicalDir + File.separator) &&
                      targetFile.isFile
                  ) {
                    return runCatching {
                      WebResourceResponse(
                        mimeTypeForPath(url),
                        "UTF-8",
                        200,
                        "OK",
                        mapOf(
                          "Access-Control-Allow-Origin" to "*",
                          "Cache-Control" to "no-cache",
                        ),
                        targetFile.inputStream(),
                      )
                    }.getOrNull()
                  }
                  return WebResourceResponse(
                    "text/plain",
                    "UTF-8",
                    404,
                    "Import Not Found",
                    mapOf("Access-Control-Allow-Origin" to "*"),
                    ByteArrayInputStream(ByteArray(0)),
                  )
                }

                return runCatching {
                  val inputStream = context.assets.open(rawPath)
                  val mimeType = mimeTypeForPath(url)
                  WebResourceResponse(
                    mimeType,
                    "UTF-8",
                    200,
                    "OK",
                    mapOf(
                      "Access-Control-Allow-Origin" to "*",
                      "Cache-Control" to "no-cache",
                    ),
                    inputStream,
                  )
                }.getOrElse {
                  // Explicit 404 prevents WebView from falling back to DNS lookup for vizag.local
                  WebResourceResponse(
                    "text/plain",
                    "UTF-8",
                    404,
                    "Not Found",
                    mapOf("Access-Control-Allow-Origin" to "*"),
                    ByteArrayInputStream(ByteArray(0)),
                  )
                }
              }
              return super.shouldInterceptRequest(view, request)
            }

            override fun onRenderProcessGone(
              view: WebView?,
              detail: RenderProcessGoneDetail?,
            ): Boolean {
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                view?.loadUrl("https://vizag.local/game/index.html")
                return true
              }
              return false
            }
          }

        bridge.attachWebView(this)
        loadUrl("https://vizag.local/game/index.html")
      }
    },
    update = { webView ->
      bridge.attachWebView(webView)
    },
  )
}

private fun mimeTypeForPath(uri: Uri): String {
  val path = uri.path.orEmpty().lowercase()
  return when {
    path.endsWith(".html") -> "text/html"
    path.endsWith(".js") || path.endsWith(".mjs") -> "text/javascript"
    path.endsWith(".css") -> "text/css"
    path.endsWith(".json") || path.endsWith(".geojson") -> "application/json"
    path.endsWith(".kml") -> "application/vnd.google-earth.kml+xml"
    path.endsWith(".tif") || path.endsWith(".tiff") -> "image/tiff"
    path.endsWith(".glb") -> "model/gltf-binary"
    path.endsWith(".gltf") -> "model/gltf+json"
    path.endsWith(".png") -> "image/png"
    path.endsWith(".jpg") || path.endsWith(".jpeg") -> "image/jpeg"
    path.endsWith(".webp") -> "image/webp"
    else -> "application/octet-stream"
  }
}
