// database/functions/workouts.js

import { db } from "../db";

// Save user information to the database
export async function saveUserInfo(name, sex, age, weight, goalWeight, heightCm) {
  try {
    const database = await db;
    const createdAt = new Date().toISOString();

    // Insert or update user_info
    await database.runAsync(`
      INSERT INTO user_info (name, sex, age, weight, goal_weight, height, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        name = excluded.name,
        sex = excluded.sex,
        age = excluded.age,
        weight = excluded.weight,
        goal_weight = excluded.goal_weight,
        height = excluded.height,
        updated_at = excluded.updated_at
    `, [name, sex, age, weight, goalWeight, height, createdAt, createdAt]);

    // If weight is provided, insert into weight_history
    if (weight) {
      await database.runAsync(`
        INSERT INTO weight_history (weight, created_at, updated_at)
        VALUES (?, ?, ?)
      `, [weight, createdAt, createdAt]);
    }
  } catch (error) {
    console.error("Error saving user info:", error);
    throw error;
  }
}

// Retrieve the user object from the database
export async function getUserInfo() {
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM user_info LIMIT 1
    `);
    return result[0] || null;
  } catch (error) {
    console.error("Error retrieving user info:", error);
    throw error;
  }
}


