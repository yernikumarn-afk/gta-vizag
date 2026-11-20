package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "player_saves")
data class PlayerSaveEntity(
  @PrimaryKey val slotId: Int = 1,
  val posX: Float = 3.5f,
  val posY: Float = 1.85f,
  val posZ: Float = 12f,
  val yaw: Float = 3.14f,
  val districtName: String = "RK Beach",
  val timeOfDay: Float = 16.4f,
  val autoCycle: Boolean = true,
  val weatherKey: String = "SUNNY",
  val activeMissionIndex: Int = 0,
  val completedMissionsCsv: String = "",
  val unlockedVehiclesCsv: String = "gt_coupe,coastal_bike,vizag_auto",
  val cashRupees: Int = 1500,
  val totalDistanceMeters: Float = 0f,
  val graphicsPreset: String = "MEDIUM",
  val resolutionScale: Float = 0.92f,
  val shadowsEnabled: Boolean = true,
  val drawDistance: Float = 340f,
  val targetFps: Int = 60,
  val audioEnabled: Boolean = true,
  val updatedAt: Long = System.currentTimeMillis(),
) {
  fun completedSet(): Set<Int> =
    completedMissionsCsv
      .split(",")
      .mapNotNull { it.trim().toIntOrNull() }
      .toSet()
}
