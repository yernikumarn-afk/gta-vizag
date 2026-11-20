package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.KeyboardDoubleArrowDown
import androidx.compose.material.icons.filled.PanTool
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.model.GameTelemetry
import kotlin.math.hypot

@Composable
fun MobileGameplayControls(
  telemetry: GameTelemetry,
  isSprintActive: Boolean,
  onJoystickChanged: (Float, Float) -> Unit,
  onCameraDragged: (Float, Float) -> Unit,
  onJump: () -> Unit,
  onToggleSprint: () -> Unit,
  onInteract: () -> Unit,
  onEnterOrExitVehicle: () -> Unit,
  onDrivingControlsChanged: (Float, Float, Float, Float) -> Unit,
  onHonkHorn: () -> Unit,
  modifier: Modifier = Modifier,
) {
  var gasPressed by remember { mutableStateOf(false) }
  var brakePressed by remember { mutableStateOf(false) }
  var revPressed by remember { mutableStateOf(false) }
  var handbrakePressed by remember { mutableStateOf(false) }

  fun emitDrivingState(
    gas: Boolean = gasPressed,
    brake: Boolean = brakePressed,
    rev: Boolean = revPressed,
    drift: Boolean = handbrakePressed,
  ) {
    onDrivingControlsChanged(
      if (gas) 1f else 0f,
      if (brake) 1f else 0f,
      if (rev) 1f else 0f,
      if (drift) 1f else 0f,
    )
  }

  LaunchedEffect(telemetry.inVehicle) {
    if (!telemetry.inVehicle) {
      gasPressed = false
      brakePressed = false
      revPressed = false
      handbrakePressed = false
      onDrivingControlsChanged(0f, 0f, 0f, 0f)
    }
  }

  Box(modifier = modifier.fillMaxSize()) {
    // Right-half Third-Person Camera Orbit Touch Area (layered behind action buttons)
    val cameraDesc = stringResource(R.string.cd_camera_pad)
    Box(
      modifier =
        Modifier.fillMaxWidth(0.60f)
          .fillMaxHeight()
          .align(Alignment.CenterEnd)
          .semantics { contentDescription = cameraDesc }
          .testTag("right_camera_pad")
          .pointerInput(Unit) {
            detectDragGestures { change, dragAmount ->
              change.consume()
              onCameraDragged(dragAmount.x, dragAmount.y)
            }
          }
    ) {
      Text(
        text = stringResource(R.string.hint_camera_drag),
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.28f),
        modifier = Modifier.align(Alignment.Center).padding(bottom = 52.dp),
      )
    }

    // Landscape Ergonomic Bottom Controls Row
    Row(
      modifier =
        Modifier.fillMaxWidth()
          .align(Alignment.BottomCenter)
          .windowInsetsPadding(WindowInsets.navigationBars)
          .padding(horizontal = 20.dp, vertical = 12.dp),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.Bottom,
    ) {
      VirtualAnalogJoystick(
        isSteeringMode = telemetry.inVehicle,
        onVectorChanged = onJoystickChanged,
      )

      if (telemetry.inVehicle) {
        VehicleDrivingCluster(
          vehicleName = telemetry.vehicleName,
          gasPressed = gasPressed,
          brakePressed = brakePressed,
          revPressed = revPressed,
          handbrakePressed = handbrakePressed,
          onGasState = { pressed ->
            gasPressed = pressed
            emitDrivingState(gas = pressed)
          },
          onBrakeState = { pressed ->
            brakePressed = pressed
            emitDrivingState(brake = pressed)
          },
          onRevState = { pressed ->
            revPressed = pressed
            emitDrivingState(rev = pressed)
          },
          onHandbrakeState = { pressed ->
            handbrakePressed = pressed
            emitDrivingState(drift = pressed)
          },
          onHonkHorn = onHonkHorn,
          onExitVehicle = onEnterOrExitVehicle,
        )
      } else {
        OnFootActionCluster(
          isSprintActive = isSprintActive,
          isSeated = telemetry.isSeated,
          nearbyVehicleName = telemetry.nearbyVehicleName,
          nearbyDistance = telemetry.nearbyVehicleDistance,
          interactHint = telemetry.interactHint,
          onJump = onJump,
          onToggleSprint = onToggleSprint,
          onInteract = onInteract,
          onEnterVehicle = onEnterOrExitVehicle,
        )
      }
    }
  }
}

@Composable
private fun VirtualAnalogJoystick(
  isSteeringMode: Boolean,
  onVectorChanged: (Float, Float) -> Unit,
) {
  var knobOffset by remember { mutableStateOf(Offset.Zero) }
  val primaryColor = MaterialTheme.colorScheme.primary
  val secondaryColor = MaterialTheme.colorScheme.secondary
  val surfaceColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.62f)
  val outlineColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.85f)
  val joystickDesc = stringResource(R.string.cd_joystick)

  Box(
    modifier =
      Modifier.size(134.dp)
        .semantics { contentDescription = joystickDesc }
        .testTag("left_joystick")
        .pointerInput(Unit) {
          val maxRadiusPx = size.width * 0.36f
          detectDragGestures(
            onDragStart = { startPos ->
              val center = Offset(size.width / 2f, size.height / 2f)
              val raw = startPos - center
              val dist = hypot(raw.x, raw.y)
              val clamped = if (dist > maxRadiusPx) raw * (maxRadiusPx / dist) else raw
              knobOffset = clamped
              onVectorChanged(
                (clamped.x / maxRadiusPx).coerceIn(-1f, 1f),
                (-clamped.y / maxRadiusPx).coerceIn(-1f, 1f),
              )
            },
            onDrag = { change, dragAmount ->
              change.consume()
              val next = knobOffset + dragAmount
              val dist = hypot(next.x, next.y)
              val clamped = if (dist > maxRadiusPx) next * (maxRadiusPx / dist) else next
              knobOffset = clamped
              onVectorChanged(
                (clamped.x / maxRadiusPx).coerceIn(-1f, 1f),
                (-clamped.y / maxRadiusPx).coerceIn(-1f, 1f),
              )
            },
            onDragEnd = {
              knobOffset = Offset.Zero
              onVectorChanged(0f, 0f)
            },
            onDragCancel = {
              knobOffset = Offset.Zero
              onVectorChanged(0f, 0f)
            },
          )
        },
    contentAlignment = Alignment.Center,
  ) {
    Canvas(modifier = Modifier.fillMaxSize()) {
      val center = Offset(size.width / 2f, size.height / 2f)
      val outerRadius = size.minDimension * 0.45f

      drawCircle(color = surfaceColor, radius = outerRadius, center = center)
      drawCircle(
        color = if (isSteeringMode) secondaryColor else outlineColor,
        radius = outerRadius,
        center = center,
        style = Stroke(width = 2.5.dp.toPx()),
      )
      drawCircle(
        color = outlineColor.copy(alpha = 0.35f),
        radius = outerRadius * 0.52f,
        center = center,
        style = Stroke(width = 1.2.dp.toPx()),
      )

      val knobCenter = center + knobOffset
      drawCircle(
        color = (if (isSteeringMode) secondaryColor else primaryColor).copy(alpha = 0.32f),
        radius = 27.dp.toPx(),
        center = knobCenter,
      )
      drawCircle(
        color = if (isSteeringMode) secondaryColor else primaryColor,
        radius = 20.dp.toPx(),
        center = knobCenter,
      )
    }
  }
}

@Composable
private fun OnFootActionCluster(
  isSprintActive: Boolean,
  isSeated: Boolean,
  nearbyVehicleName: String,
  nearbyDistance: Float,
  interactHint: String,
  onJump: () -> Unit,
  onToggleSprint: () -> Unit,
  onInteract: () -> Unit,
  onEnterVehicle: () -> Unit,
) {
  val vehicleClose = nearbyDistance <= 16.0f
  val vehicleIcon =
    if (nearbyVehicleName.contains("Bike", ignoreCase = true)) {
      Icons.Filled.TwoWheeler
    } else {
      Icons.Filled.DirectionsCar
    }

  Column(
    horizontalAlignment = Alignment.End,
    verticalArrangement = Arrangement.spacedBy(10.dp),
  ) {
    // Top Action Row: Contextual Hint + Door/Seat/Object Interact + Enter Vehicle
    Row(
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
      val statusChipText =
        when {
          interactHint.isNotEmpty() -> interactHint
          vehicleClose && nearbyVehicleName.isNotEmpty() ->
            "$nearbyVehicleName • ${nearbyDistance.toInt()}m"
          else -> ""
        }

      if (statusChipText.isNotEmpty()) {
        Surface(
          shape = RoundedCornerShape(10.dp),
          color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.90f),
          border = BorderStroke(1.dp, MaterialTheme.colorScheme.secondary),
        ) {
          Text(
            text = statusChipText,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSecondaryContainer,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
          )
        }
      }

      RoundTacticalActionButton(
        label = if (isSeated) stringResource(R.string.btn_stand) else stringResource(R.string.btn_interact),
        icon = Icons.Filled.RecordVoiceOver,
        highlighted = isSeated || interactHint.isNotEmpty(),
        highlightColor = MaterialTheme.colorScheme.tertiary,
        size = 54.dp,
        testTag = "interact_button",
        onClick = onInteract,
      )

      RoundTacticalActionButton(
        label = stringResource(R.string.btn_enter_vehicle),
        icon = vehicleIcon,
        highlighted = vehicleClose,
        highlightColor = MaterialTheme.colorScheme.secondary,
        size = 56.dp,
        testTag = "enter_vehicle_button",
        onClick = onEnterVehicle,
      )
    }

    // Bottom Action Row: RUN/Sprint Toggle + JUMP Impulse
    Row(
      horizontalArrangement = Arrangement.spacedBy(12.dp),
      verticalAlignment = Alignment.Bottom,
    ) {
      RoundTacticalActionButton(
        label = stringResource(R.string.btn_run),
        icon = Icons.AutoMirrored.Filled.DirectionsRun,
        highlighted = isSprintActive,
        highlightColor = MaterialTheme.colorScheme.primary,
        size = 56.dp,
        testTag = "run_button",
        onClick = onToggleSprint,
      )

      RoundTacticalActionButton(
        label = stringResource(R.string.btn_jump),
        icon = Icons.Filled.ArrowUpward,
        highlighted = false,
        highlightColor = MaterialTheme.colorScheme.primary,
        size = 64.dp,
        testTag = "jump_button",
        onClick = onJump,
      )
    }
  }
}

@Composable
private fun VehicleDrivingCluster(
  vehicleName: String,
  gasPressed: Boolean,
  brakePressed: Boolean,
  revPressed: Boolean,
  handbrakePressed: Boolean,
  onGasState: (Boolean) -> Unit,
  onBrakeState: (Boolean) -> Unit,
  onRevState: (Boolean) -> Unit,
  onHandbrakeState: (Boolean) -> Unit,
  onHonkHorn: () -> Unit,
  onExitVehicle: () -> Unit,
) {
  Column(
    horizontalAlignment = Alignment.End,
    verticalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    // Top Row: Vehicle Badge + Horn + Handbrake + Exit Vehicle
    Row(
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      if (vehicleName.isNotEmpty()) {
        Surface(
          shape = RoundedCornerShape(10.dp),
          color = MaterialTheme.colorScheme.surface.copy(alpha = 0.84f),
          border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        ) {
          Text(
            text = vehicleName,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
          )
        }
      }

      RoundTacticalActionButton(
        label = stringResource(R.string.btn_horn),
        icon = Icons.Filled.Campaign,
        highlighted = false,
        highlightColor = MaterialTheme.colorScheme.primary,
        size = 50.dp,
        testTag = "horn_button",
        onClick = onHonkHorn,
      )

      RoundTacticalActionButton(
        label = stringResource(R.string.btn_exit_vehicle),
        icon = Icons.AutoMirrored.Filled.ExitToApp,
        highlighted = false,
        highlightColor = MaterialTheme.colorScheme.error,
        size = 50.dp,
        testTag = "exit_vehicle_button",
        onClick = onExitVehicle,
      )
    }

    // Bottom Pedal Row: Handbrake (DRIFT) + Reverse (REV) + Brake + Gas (Accelerator)
    Row(
      horizontalArrangement = Arrangement.spacedBy(8.dp),
      verticalAlignment = Alignment.Bottom,
    ) {
      HoldPedalButton(
        label = stringResource(R.string.btn_handbrake),
        icon = Icons.Filled.PanTool,
        pressed = handbrakePressed,
        activeColor = MaterialTheme.colorScheme.primary,
        width = 56.dp,
        height = 58.dp,
        testTag = "handbrake_button",
        onPressChanged = onHandbrakeState,
      )

      HoldPedalButton(
        label = stringResource(R.string.btn_reverse),
        icon = Icons.AutoMirrored.Filled.Undo,
        pressed = revPressed,
        activeColor = MaterialTheme.colorScheme.secondary,
        width = 56.dp,
        height = 62.dp,
        testTag = "reverse_button",
        onPressChanged = onRevState,
      )

      HoldPedalButton(
        label = stringResource(R.string.btn_brake),
        icon = Icons.Filled.KeyboardDoubleArrowDown,
        pressed = brakePressed,
        activeColor = MaterialTheme.colorScheme.error,
        width = 62.dp,
        height = 70.dp,
        testTag = "brake_button",
        onPressChanged = onBrakeState,
      )

      HoldPedalButton(
        label = stringResource(R.string.btn_accelerate),
        icon = Icons.Filled.Speed,
        pressed = gasPressed,
        activeColor = MaterialTheme.colorScheme.tertiary,
        width = 70.dp,
        height = 88.dp,
        testTag = "accelerate_button",
        onPressChanged = onGasState,
      )
    }
  }
}

@Composable
private fun RoundTacticalActionButton(
  label: String,
  icon: ImageVector,
  highlighted: Boolean,
  highlightColor: Color,
  size: Dp,
  testTag: String,
  onClick: () -> Unit,
) {
  val bg =
    if (highlighted) highlightColor.copy(alpha = 0.92f)
    else MaterialTheme.colorScheme.surface.copy(alpha = 0.80f)
  val fg =
    if (highlighted) MaterialTheme.colorScheme.onPrimary
    else MaterialTheme.colorScheme.onSurface
  val borderCol = if (highlighted) highlightColor else MaterialTheme.colorScheme.outline

  Box(
    modifier =
      Modifier.minimumInteractiveComponentSize()
        .size(size)
        .clip(CircleShape)
        .background(bg)
        .border(2.dp, borderCol, CircleShape)
        .clickable(onClick = onClick)
        .semantics { contentDescription = label }
        .testTag(testTag),
    contentAlignment = Alignment.Center,
  ) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
      Icon(
        imageVector = icon,
        contentDescription = null,
        tint = fg,
        modifier = Modifier.size(20.dp),
      )
      Text(
        text = label,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        color = fg,
      )
    }
  }
}

@Composable
private fun HoldPedalButton(
  label: String,
  icon: ImageVector,
  pressed: Boolean,
  activeColor: Color,
  width: Dp,
  height: Dp,
  testTag: String,
  onPressChanged: (Boolean) -> Unit,
) {
  val shape = RoundedCornerShape(14.dp)
  val bg =
    if (pressed) activeColor.copy(alpha = 0.92f)
    else MaterialTheme.colorScheme.surface.copy(alpha = 0.82f)
  val fg =
    if (pressed) MaterialTheme.colorScheme.onPrimary
    else MaterialTheme.colorScheme.onSurface

  Box(
    modifier =
      Modifier.minimumInteractiveComponentSize()
        .width(width)
        .height(height)
        .clip(shape)
        .background(bg)
        .border(2.dp, if (pressed) activeColor else MaterialTheme.colorScheme.outline, shape)
        .semantics { contentDescription = label }
        .testTag(testTag)
        .pointerInput(Unit) {
          detectTapGestures(
            onPress = {
              onPressChanged(true)
              tryAwaitRelease()
              onPressChanged(false)
            }
          )
        },
    contentAlignment = Alignment.Center,
  ) {
    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.Center,
    ) {
      Icon(imageVector = icon, contentDescription = null, tint = fg, modifier = Modifier.size(20.dp))
      Spacer(modifier = Modifier.height(2.dp))
      Text(
        text = label,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        color = fg,
      )
    }
  }
}
