package com.example.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface VizagSaveDao {
  @Query("SELECT * FROM player_saves WHERE slotId = 1 LIMIT 1")
  fun observePrimarySave(): Flow<PlayerSaveEntity?>

  @Query("SELECT * FROM player_saves WHERE slotId = 1 LIMIT 1")
  suspend fun getPrimarySaveOnce(): PlayerSaveEntity?

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsertSave(save: PlayerSaveEntity)

  @Query("DELETE FROM player_saves WHERE slotId = 1")
  suspend fun clearPrimarySave()
}
