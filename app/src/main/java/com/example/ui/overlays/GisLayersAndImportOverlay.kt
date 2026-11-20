package com.example.ui.overlays

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.model.GisDatasetStatus
import com.example.model.GisLayerState
import com.example.ui.components.VizagAnimatedBackdrop
import com.example.ui.theme.LocalViceColors

@Composable
fun GisLayersAndImportOverlay(
  layers: List<GisLayerState>,
  datasets: List<GisDatasetStatus>,
  isImporting: Boolean,
  onToggleLayer: (String, Boolean) -> Unit,
  onImportDocument: (android.content.Context, android.net.Uri, String) -> Unit,
  onClose: () -> Unit,
  modifier: Modifier = Modifier,
) {
  BackHandler(onBack = onClose)
  val vice = LocalViceColors.current
  val context = LocalContext.current
  var pendingHint by remember { mutableStateOf("auto") }

  val docPickerLauncher =
    rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
      if (uri != null) {
        onImportDocument(context, uri, pendingHint)
      }
    }

  Box(modifier = modifier.fillMaxSize().testTag("gis_layers_overlay")) {
    VizagAnimatedBackdrop(scrimAlpha = 0.90f, showScenicBadge = false, showPalms = true)

    Column(
      modifier =
        Modifier.fillMaxSize()
          .windowInsetsPadding(WindowInsets.safeDrawing)
          .padding(horizontal = 20.dp, vertical = 12.dp),
      verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
      // Header Bar
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Column(modifier = Modifier.weight(1f)) {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
          ) {
            Icon(
              imageVector = Icons.Filled.Layers,
              contentDescription = null,
              tint = vice.neonCyan,
              modifier = Modifier.size(22.dp),
            )
            Text(
              text = stringResource(R.string.gis_overlay_title),
              style = MaterialTheme.typography.headlineSmall,
              color = vice.neonCyan,
            )
          }
          Text(
            text = stringResource(R.string.gis_overlay_subtitle),
            style = MaterialTheme.typography.labelMedium,
            color = vice.neonPink,
          )
        }

        IconButton(
          onClick = onClose,
          modifier = Modifier.size(48.dp).testTag("close_gis_layers_button"),
        ) {
          Icon(
            imageVector = Icons.Filled.Close,
            contentDescription = stringResource(R.string.btn_close),
            tint = Color.White,
          )
        }
      }

      // Two-Pane Landscape GIS Inspector
      Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
      ) {
        // Left Pane: 10 Toggleable Geographic Map Layers
        LazyColumn(
          modifier = Modifier.weight(1.05f).fillMaxHeight().testTag("gis_layers_list"),
          verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          items(layers, key = { it.id }) { layer ->
            val badgeColor =
              when (layer.sourceType) {
                "IMPORTED_FILE" -> vice.staminaTeal
                "MISSING_FILE" -> vice.sunsetOrange
                else -> vice.neonCyan
              }
            Surface(
              shape = RoundedCornerShape(14.dp),
              color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
              border =
                BorderStroke(
                  1.dp,
                  if (layer.visible) badgeColor.copy(alpha = 0.7f)
                  else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                ),
            ) {
              Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
              ) {
                Column(
                  modifier = Modifier.weight(1f).padding(end = 8.dp),
                  verticalArrangement = Arrangement.spacedBy(3.dp),
                ) {
                  Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                  ) {
                    Text(
                      text = layer.name,
                      style = MaterialTheme.typography.titleSmall,
                      fontWeight = FontWeight.SemiBold,
                      color = Color.White,
                    )
                    Surface(
                      shape = RoundedCornerShape(6.dp),
                      color = badgeColor.copy(alpha = 0.18f),
                    ) {
                      Text(
                        text = "${layer.sourceType} (${layer.featureCount})",
                        style = MaterialTheme.typography.labelSmall,
                        color = badgeColor,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                      )
                    }
                  }
                  Text(
                    text = layer.sourceName,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                  )
                }

                Switch(
                  checked = layer.visible,
                  onCheckedChange = { checked -> onToggleLayer(layer.id, checked) },
                  modifier = Modifier.testTag("gis_layer_switch_${layer.id}"),
                )
              }
            }
          }
        }

        // Right Pane: Honest External Dataset Manifest & Live SAF Import Workflow
        LazyColumn(
          modifier = Modifier.weight(1.1f).fillMaxHeight().testTag("gis_datasets_list"),
          verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          item(key = "import_hero_card") {
            Surface(
              shape = RoundedCornerShape(16.dp),
              color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
              border = BorderStroke(1.2.dp, vice.neonPink),
              modifier = Modifier.fillMaxWidth(),
            ) {
              Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
              ) {
                Row(
                  verticalAlignment = Alignment.CenterVertically,
                  horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                  Icon(
                    imageVector = Icons.Filled.WarningAmber,
                    contentDescription = null,
                    tint = vice.sunsetOrange,
                    modifier = Modifier.size(18.dp),
                  )
                  Text(
                    text = "HONEST DATA STATUS & LIVE FILE IMPORT",
                    style = MaterialTheme.typography.labelLarge,
                    color = vice.sunsetOrange,
                  )
                }
                Text(
                  text =
                    "External GIS archives (GVMC KML, OSM GeoJSON, VMRDA Master Plan, Copernicus GeoTIFF, NATMO imagery) and the uploaded orthographic image are NOT bundled inside the APK. Curated WGS84 Visakhapatnam fallback geometry is active until you import real local files below.",
                  style = MaterialTheme.typography.bodySmall,
                  color = MaterialTheme.colorScheme.onSurface,
                )
                Button(
                  onClick = {
                    pendingHint = "auto"
                    docPickerLauncher.launch(arrayOf("*/*"))
                  },
                  enabled = !isImporting,
                  colors =
                    ButtonDefaults.buttonColors(
                      containerColor = vice.neonPink,
                      contentColor = Color.White,
                    ),
                  modifier = Modifier.fillMaxWidth().height(48.dp).testTag("import_gis_general_button"),
                ) {
                  if (isImporting) {
                    CircularProgressIndicator(
                      color = Color.White,
                      strokeWidth = 2.dp,
                      modifier = Modifier.size(18.dp),
                    )
                  } else {
                    Icon(
                      imageVector = Icons.Filled.CloudUpload,
                      contentDescription = null,
                      modifier = Modifier.size(18.dp),
                    )
                  }
                  Spacer(modifier = Modifier.width(8.dp))
                  Text(
                    text =
                      if (isImporting) "IMPORTING FILE INTO CHUNKS..."
                      else stringResource(R.string.btn_import_gis_any),
                    style = MaterialTheme.typography.labelLarge,
                  )
                }
              }
            }
          }

          items(datasets, key = { it.id }) { ds ->
            val isLive = ds.status == "IMPORTED_LIVE"
            val accent = if (isLive) vice.staminaTeal else vice.sunsetOrange
            Surface(
              shape = RoundedCornerShape(14.dp),
              color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
              border = BorderStroke(1.dp, if (isLive) vice.staminaTeal else MaterialTheme.colorScheme.outline),
            ) {
              Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
              ) {
                Row(
                  modifier = Modifier.fillMaxWidth(),
                  horizontalArrangement = Arrangement.SpaceBetween,
                  verticalAlignment = Alignment.CenterVertically,
                ) {
                  Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f),
                  ) {
                    Icon(
                      imageVector = if (isLive) Icons.Filled.CheckCircle else Icons.Filled.WarningAmber,
                      contentDescription = null,
                      tint = accent,
                      modifier = Modifier.size(18.dp),
                    )
                    Column {
                      Text(
                        text = ds.title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                      )
                      Text(
                        text = "Format: ${ds.expectedFormat} • Status: ${ds.status}",
                        style = MaterialTheme.typography.labelSmall,
                        color = accent,
                      )
                    }
                  }

                  OutlinedButton(
                    onClick = {
                      pendingHint = ds.id
                      docPickerLauncher.launch(arrayOf("*/*"))
                    },
                    enabled = !isImporting,
                    border = BorderStroke(1.dp, vice.neonCyan),
                    modifier = Modifier.height(48.dp).testTag("import_dataset_${ds.id}"),
                  ) {
                    Text(
                      text = if (isLive) "REPLACE" else "IMPORT",
                      style = MaterialTheme.typography.labelLarge,
                      color = vice.neonCyan,
                    )
                  }
                }
                Text(
                  text = ds.detail,
                  style = MaterialTheme.typography.bodySmall,
                  color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
              }
            }
          }
        }
      }
    }
  }
}
