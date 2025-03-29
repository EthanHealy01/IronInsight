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

export const saveWeight = async (weight) => {
  const createdAt = new Date().toISOString();
  const updatedAt = createdAt;
  try {
    await db.runAsync(`
      INSERT INTO weight_history (weight, created_at, updated_at)
      VALUES (?, ?, ?);
    `, [weight, createdAt, updatedAt]);
    
    await db.runAsync(`
      UPDATE user_info SET weight = ?;
    `, [weight]);

    console.log("Weight saved successfully:", weight, createdAt);
  } catch (error) {
    console.error("Error saving weight:", error);
    throw error;
  }
};

export const getWeightHistory = async () => {
  try {
    // First, get the weight history
    const weightResults = await db.getAllAsync(`
      SELECT * FROM weight_history 
      WHERE weight IS NOT NULL 
      ORDER BY created_at DESC;
    `);
    
    // Second, get the goal weight from user_info
    const userInfoResults = await db.getAllAsync(`
      SELECT goal_weight, weight as current_weight FROM user_info
      LIMIT 1;
    `);
    
    // Combine the results
    const goalWeight = userInfoResults.length > 0 ? userInfoResults[0].goal_weight : null;
    const currentWeight = userInfoResults.length > 0 ? userInfoResults[0].current_weight : null;
    return {
      weights: weightResults,
      goalWeight: goalWeight,
      currentWeight: currentWeight
    };
  } catch (error) {
    console.error("Error retrieving weight history:", error);
    return { weights: [], goalWeight: null };
  }
};

export const updateGoalWeight = async (goalWeight) => {
  try {
    const database = await db;
    const updatedAt = new Date().toISOString();
    
    await database.runAsync(`
      UPDATE user_info 
      SET goal_weight = ?, updated_at = ?
    `, [goalWeight, updatedAt]);
    
    console.log("Goal weight updated successfully:", goalWeight);
    return true;
  } catch (error) {
    console.error("Error updating goal weight:", error);
    throw error;
  }
};




