// database/functions/workouts.js

import { db } from "../db";

// Save user information to the database
export async function saveUserInfo(name, sex, age, weight, goalWeight, heightCm, selectedMetric = 'kg', profilePicture = null) {
  try {
    const database = await db;
    const createdAt = new Date().toISOString();

    // Check if there's an existing user record
    const existingUser = await database.getAllAsync(`SELECT id FROM user_info LIMIT 1`);
    
    if (existingUser && existingUser.length > 0) {
      // Update existing user
      await database.runAsync(`
        UPDATE user_info SET
          name = ?,
          sex = ?,
          age = ?,
          weight = ?,
          goal_weight = ?,
          height = ?,
          selected_metric = ?,
          profile_picture = ?,
          updated_at = ?
      `, [name, sex, age, weight, goalWeight, heightCm, selectedMetric, profilePicture, createdAt]);
    } else {
      // Insert new user
      await database.runAsync(`
        INSERT INTO user_info (name, sex, age, weight, goal_weight, height, selected_metric, profile_picture, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [name, sex, age, weight, goalWeight, heightCm, selectedMetric, profilePicture, createdAt, createdAt]);
    }

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

/**
 * Update the user's preferred weight metric (kg or lbs)
 * @param {string} metric - The preferred metric ('kg' or 'lbs')
 * @returns {boolean} True if successful
 */
export const updateSelectedMetric = async (metric) => {
  try {
    if (metric !== 'kg' && metric !== 'lbs') {
      throw new Error("Invalid metric. Must be 'kg' or 'lbs'");
    }
    
    const database = await db;
    const updatedAt = new Date().toISOString();
    
    await database.runAsync(`
      UPDATE user_info 
      SET selected_metric = ?, updated_at = ?
    `, [metric, updatedAt]);
    
    console.log("Selected metric updated successfully:", metric);
    return true;
  } catch (error) {
    console.error("Error updating selected metric:", error);
    throw error;
  }
};

/**
 * Update the user's profile picture path
 * @param {string} picturePath - Path to the profile picture file
 * @returns {boolean} True if successful
 */
export const updateProfilePicture = async (picturePath) => {
  try {
    const database = await db;
    const updatedAt = new Date().toISOString();
    
    await database.runAsync(`
      UPDATE user_info 
      SET profile_picture = ?, updated_at = ?
    `, [picturePath, updatedAt]);
    
    console.log("Profile picture updated successfully:", picturePath);
    return true;
  } catch (error) {
    console.error("Error updating profile picture:", error);
    throw error;
  }
};




