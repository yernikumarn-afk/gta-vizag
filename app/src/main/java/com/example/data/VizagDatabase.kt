package com.example.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [PlayerSaveEntity::class], version = 2, exportSchema = false)
abstract class VizagDatabase : RoomDatabase() {
  abstract fun saveDao(): VizagSaveDao

  companion object {
    @Volatile private var instance: VizagDatabase? = null

    fun getInstance(context: Context): VizagDatabase {
      return instance
        ?: synchronized(this) {
          instance
            ?: Room.databaseBuilder(
                context.applicationContext,
                VizagDatabase::class.java,
                "vizag_city_open_world.db",
              )
              .fallbackToDestructiveMigration(dropAllTables = true)
              .build()
              .also { instance = it }
        }
    }
  }
}
