import { db } from '../db';
import { getUserInfo } from './user';

/**
 * Save a run to the database
 * @param {Object} run - Run data object
 * @param {string} run.name - Name of the run
 * @param {number} run.distance - Distance in kilometers
 * @param {number} run.duration - Duration in seconds
 * @param {number} run.pace - Pace in minutes per kilometer
 * @param {string} run.startTime - ISO string of start time
 * @param {string} run.endTime - ISO string of end time
 * @param {string} run.routeData - JSON string of route coordinates
 * @param {Object} run.splitTimes - Object with split times at key distances
 * @param {number} run.calories - Estimated calories burned
 * @returns {Promise<number>} - ID of the saved run
 */
export async function saveRun(run) {
  try {
    console.log("🔍 DB: saveRun function called with run data:", typeof run);
    console.log("🔍 DB: run object keys:", Object.keys(run));
    
    // Validate the run object
    if (!run) {
      console.error("🔍 DB: run object is null or undefined");
      throw new Error("Run object is null or undefined");
    }
    
    // Get user info, if available
    let userId = null;
    try {
      console.log("🔍 DB: Attempting to get user info");
      const userInfo = await getUserInfo();
      userId = userInfo?.id || null;
      console.log("🔍 DB: User ID retrieved:", userId);
    } catch (userError) {
      console.error("🔍 DB: Error getting user info:", userError);
      // Continue with null userId
    }
    
    const now = new Date().toISOString();
    
    console.log('🔍 DB: Run data received, inspecting properties:');
    
    // Check each expected property and log its value and type
    const properties = ['name', 'distance', 'duration', 'pace', 'startTime', 
      'endTime', 'routeData', 'splitTimes', 'calories'];
    
    properties.forEach(prop => {
      console.log(`🔍 DB: run.${prop}:`, run[prop], 
        `type: ${typeof run[prop]}`, 
        `value: ${JSON.stringify(run[prop])}`);
    });
    
    // Check if the db instance is ready
    console.log("🔍 DB: Checking database instance");
    if (!db) {
      console.error("🔍 DB: Database instance is not initialized");
      throw new Error("Database is not initialized");
    }
    
    // Ensure required fields have valid values (not null)
    console.log("🔍 DB: Sanitizing run data");
    const sanitizedRun = {
      ...run,
      name: run.name || `Run on ${new Date().toLocaleDateString()}`,
      distance: typeof run.distance === 'number' ? run.distance : 0,
      duration: typeof run.duration === 'number' ? Math.floor(run.duration) : 0,
      pace: typeof run.pace === 'number' ? run.pace : 0,
      startTime: run.startTime || now,
      endTime: run.endTime || now,
      routeData: run.routeData || '[]'
    };
    
    // Log the sanitized values
    console.log("🔍 DB: After sanitization:");
    properties.forEach(prop => {
      console.log(`🔍 DB: sanitizedRun.${prop}:`, sanitizedRun[prop], 
        `type: ${typeof sanitizedRun[prop]}`);
    });
    
    // Extract split times from the run object
    console.log("🔍 DB: Extracting split times");
    
    // Helper function to validate time values
    const validateTimeValue = (time) => {
      // Check if the value is a valid number (not null, undefined, Infinity, or NaN)
      if (time === null || time === undefined) return null;
      if (!Number.isFinite(time)) return null; // Handles Infinity and NaN
      return time;
    };
    
    const timeAt1k = validateTimeValue(sanitizedRun.splitTimes?.['1k']);
    const timeAt5k = validateTimeValue(sanitizedRun.splitTimes?.['5k']);
    const timeAt10k = validateTimeValue(sanitizedRun.splitTimes?.['10k']);
    const timeAtHalfMarathon = validateTimeValue(sanitizedRun.splitTimes?.['halfMarathon']);
    const timeAtMarathon = validateTimeValue(sanitizedRun.splitTimes?.['marathon']);
    
    console.log("🔍 DB: Split times extracted and validated:", {
      '1k': timeAt1k,
      '5k': timeAt5k,
      '10k': timeAt10k,
      'halfMarathon': timeAtHalfMarathon,
      'marathon': timeAtMarathon
    });
    
    // Construct the SQL parameters array
    const params = [
      userId,
      sanitizedRun.name,
      sanitizedRun.distance,
      sanitizedRun.duration,
      sanitizedRun.pace,
      sanitizedRun.startTime,
      sanitizedRun.endTime,
      sanitizedRun.routeData,
      timeAt1k,
      timeAt5k,
      timeAt10k,
      timeAtHalfMarathon,
      timeAtMarathon,
      sanitizedRun.calories || 0,
      now,
      now
    ];
    
    console.log("🔍 DB: SQL parameters prepared:", params.map((p, i) => 
      `param[${i}]: ${p} (${typeof p})`).join('\n'));
    
    console.log("🔍 DB: Executing SQL INSERT statement");
    
    // Save the run to the database
    try {
      await db.execAsync(
        `INSERT INTO runs (
          user_id, 
          name, 
          distance, 
          duration, 
          pace, 
          start_time, 
          end_time, 
          route_data,
          time_at_1k,
          time_at_5k,
          time_at_10k,
          time_at_half_marathon,
          time_at_marathon,
          calories,
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params
      );
      console.log("🔍 DB: SQL INSERT executed successfully");
    } catch (sqlError) {
      console.error("🔍 DB: Error executing SQL INSERT:", sqlError);
      console.error("🔍 DB: SQL Error stack:", sqlError.stack);
      throw sqlError;
    }
    
    // Get the inserted ID using a separate query
    console.log("🔍 DB: Getting last inserted ID");
    let insertedId = null;
    try {
      const lastInsertIdResult = await db.getAllAsync('SELECT last_insert_rowid() as id');
      insertedId = lastInsertIdResult[0]?.id;
      console.log("🔍 DB: Last insert ID result:", lastInsertIdResult);
      console.log("🔍 DB: Inserted ID:", insertedId);
    } catch (idError) {
      console.error("🔍 DB: Error getting last insert ID:", idError);
      throw idError;
    }
    
    // Verify the run was actually saved
    try {
      console.log("🔍 DB: Verifying run was saved with ID:", insertedId);
      const savedRun = await db.getAllAsync('SELECT * FROM runs WHERE id = ?', [insertedId]);
      console.log("🔍 DB: Verification result:", savedRun.length > 0 ? "Found" : "Not found");
      if (savedRun.length > 0) {
        console.log("🔍 DB: Saved run data:", JSON.stringify(savedRun[0]));
      }
    } catch (verifyError) {
      console.error("🔍 DB: Error verifying saved run:", verifyError);
      // Don't throw - this is just for logging
    }
    
    console.log('🔍 DB: Run saved successfully with ID:', insertedId);
    
    return insertedId;
  } catch (error) {
    console.error('🔍 DB: Error saving run:', error);
    console.error('🔍 DB: Error stack:', error.stack);
    throw error;
  }
}

/**
 * Get all runs from the database
 * @returns {Promise<Array>} - Array of run objects
 */
export async function getAllRuns() {
  try {
    const runs = await db.getAllAsync(
      `SELECT 
        id, 
        user_id, 
        name, 
        distance, 
        duration, 
        pace, 
        start_time, 
        end_time,
        route_data,
        time_at_1k,
        time_at_5k,
        time_at_10k,
        time_at_half_marathon,
        time_at_marathon,
        calories,
        created_at, 
        updated_at 
      FROM runs 
      ORDER BY start_time DESC`
    );
    
    // Transform the data for easier use in the app
    return runs.map(run => ({
      id: run.id,
      userId: run.user_id,
      name: run.name || `Run on ${new Date(run.start_time).toLocaleDateString()}`,
      distance: run.distance,
      duration: run.duration,
      pace: run.pace,
      startTime: run.start_time,
      endTime: run.end_time,
      routeData: run.route_data ? JSON.parse(run.route_data) : [],
      splitTimes: {
        '1k': run.time_at_1k,
        '5k': run.time_at_5k,
        '10k': run.time_at_10k,
        'halfMarathon': run.time_at_half_marathon,
        'marathon': run.time_at_marathon,
      },
      calories: run.calories,
      createdAt: run.created_at,
      updatedAt: run.updated_at
    }));
  } catch (error) {
    console.error('Error getting all runs:', error);
    throw error;
  }
}

/**
 * Get a run by ID
 * @param {number} id - Run ID
 * @returns {Promise<Object>} - Run object
 */
export async function getRunById(id) {
  try {
    const runs = await db.getAllAsync(
      `SELECT 
        id, 
        user_id, 
        name, 
        distance, 
        duration, 
        pace, 
        start_time, 
        end_time,
        route_data,
        time_at_1k,
        time_at_5k,
        time_at_10k,
        time_at_half_marathon,
        time_at_marathon,
        calories,
        created_at, 
        updated_at 
      FROM runs 
      WHERE id = ?`,
      [id]
    );
    
    if (runs.length === 0) {
      return null;
    }
    
    const run = runs[0];
    
    return {
      id: run.id,
      userId: run.user_id,
      name: run.name || `Run on ${new Date(run.start_time).toLocaleDateString()}`,
      distance: run.distance,
      duration: run.duration,
      pace: run.pace,
      startTime: run.start_time,
      endTime: run.end_time,
      routeData: run.route_data ? JSON.parse(run.route_data) : [],
      splitTimes: {
        '1k': run.time_at_1k,
        '5k': run.time_at_5k,
        '10k': run.time_at_10k,
        'halfMarathon': run.time_at_half_marathon,
        'marathon': run.time_at_marathon,
      },
      calories: run.calories,
      createdAt: run.created_at,
      updatedAt: run.updated_at
    };
  } catch (error) {
    console.error('Error getting run by ID:', error);
    throw error;
  }
}

/**
 * Update a run
 * @param {number} id - Run ID
 * @param {Object} updates - Run data to update
 * @returns {Promise<boolean>} - Success status
 */
export async function updateRun(id, updates) {
  try {
    const now = new Date().toISOString();
    const run = await getRunById(id);
    
    if (!run) {
      throw new Error(`Run with ID ${id} not found`);
    }
    
    // Extract split times from the updates object
    const timeAt1k = updates.splitTimes?.['1k'] !== undefined 
      ? updates.splitTimes['1k'] 
      : run.splitTimes['1k'];
      
    const timeAt5k = updates.splitTimes?.['5k'] !== undefined 
      ? updates.splitTimes['5k'] 
      : run.splitTimes['5k'];
      
    const timeAt10k = updates.splitTimes?.['10k'] !== undefined 
      ? updates.splitTimes['10k'] 
      : run.splitTimes['10k'];
      
    const timeAtHalfMarathon = updates.splitTimes?.['halfMarathon'] !== undefined 
      ? updates.splitTimes['halfMarathon'] 
      : run.splitTimes['halfMarathon'];
      
    const timeAtMarathon = updates.splitTimes?.['marathon'] !== undefined 
      ? updates.splitTimes['marathon'] 
      : run.splitTimes['marathon'];
    
    // Update the run in the database
    await db.execAsync(
      `UPDATE runs SET
        name = ?,
        distance = ?,
        duration = ?,
        pace = ?,
        start_time = ?,
        end_time = ?,
        route_data = ?,
        time_at_1k = ?,
        time_at_5k = ?,
        time_at_10k = ?,
        time_at_half_marathon = ?,
        time_at_marathon = ?,
        calories = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        updates.name || run.name,
        updates.distance !== undefined ? updates.distance : run.distance,
        updates.duration !== undefined ? updates.duration : run.duration,
        updates.pace !== undefined ? updates.pace : run.pace,
        updates.startTime || run.startTime,
        updates.endTime || run.endTime,
        updates.routeData ? JSON.stringify(updates.routeData) : run.routeData.length > 0 ? JSON.stringify(run.routeData) : null,
        timeAt1k,
        timeAt5k,
        timeAt10k,
        timeAtHalfMarathon,
        timeAtMarathon,
        updates.calories !== undefined ? updates.calories : run.calories,
        now,
        id
      ]
    );
    
    return true;
  } catch (error) {
    console.error('Error updating run:', error);
    throw error;
  }
}

/**
 * Delete a run by ID
 * @param {number} id - Run ID
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteRun(id) {
  try {
    await db.execAsync('DELETE FROM runs WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting run:', error);
    throw error;
  }
}

/**
 * Calculate split times for a completed run
 * @param {Array} coordinates - Array of location objects with timestamps
 * @param {number} totalDistance - Total distance in km
 * @returns {Object} - Object with split times at key distances
 */
export function calculateSplitTimes(coordinates, totalDistance) {
  if (!coordinates || coordinates.length < 2) {
    return {};
  }
  
  const splitTimes = {};
  
  // Define key distances in km
  const keyDistances = {
    '1k': 1,
    '5k': 5,
    '10k': 10,
    'halfMarathon': 21.0975, // 13.1 miles
    'marathon': 42.195      // 26.2 miles
  };
  
  // Get start time from first coordinate
  const startTime = new Date(coordinates[0].timestamp).getTime();
  
  // Current distance traveled
  let distanceSoFar = 0;
  
  // Process each coordinate pair to calculate distance and check if we've passed key distances
  for (let i = 1; i < coordinates.length; i++) {
    const prevCoord = coordinates[i-1];
    const currCoord = coordinates[i];
    
    // Calculate distance between previous and current coordinates
    const segmentDistance = calculateDistance(
      prevCoord.latitude, 
      prevCoord.longitude, 
      currCoord.latitude, 
      currCoord.longitude
    );
    
    // Add to total distance
    distanceSoFar += segmentDistance;
    
    // Check if we've passed any key distances
    Object.entries(keyDistances).forEach(([key, distance]) => {
      // If this segment crosses a key distance and we haven't recorded it yet
      if (distanceSoFar >= distance && !splitTimes[key]) {
        // Calculate the time at which we passed this distance
        // Simple linear interpolation between the two points
        const prevDistance = distanceSoFar - segmentDistance;
        const distanceRatio = (distance - prevDistance) / segmentDistance;
        
        const prevTime = new Date(prevCoord.timestamp).getTime();
        const currTime = new Date(currCoord.timestamp).getTime();
        const timeAtDistance = prevTime + ((currTime - prevTime) * distanceRatio);
        
        // Store time in seconds from start
        splitTimes[key] = Math.floor((timeAtDistance - startTime) / 1000);
      }
    });
  }
  
  // If our total distance is less than any key distance, those splits will be null
  Object.keys(keyDistances).forEach(key => {
    if (keyDistances[key] > totalDistance) {
      splitTimes[key] = null;
    }
  });
  
  return splitTimes;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

/**
 * Convert degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} - Radians
 */
function deg2rad(deg) {
  return deg * (Math.PI/180);
}

/**
 * Verify the database structure for runs table
 * This is useful for debugging schema issues
 */
export async function verifyRunsTable() {
  try {
    console.log("🔍 DB: Verifying runs table structure");
    
    // Check if the table exists
    const tableCheck = await db.getAllAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='runs';
    `);
    
    if (tableCheck.length === 0) {
      console.error("🔍 DB: runs table does not exist!");
      return false;
    }
    
    console.log("🔍 DB: runs table exists");
    
    // Get table structure
    const tableInfo = await db.getAllAsync(`PRAGMA table_info(runs);`);
    console.log("🔍 DB: runs table structure:", JSON.stringify(tableInfo, null, 2));
    
    // Check columns
    const columns = tableInfo.map(col => ({
      name: col.name,
      type: col.type,
      notNull: col.notnull === 1,
      defaultValue: col.dflt_value
    }));
    
    console.log("🔍 DB: Column definitions:", columns);
    
    // Check for existing rows
    const rowCount = await db.getAllAsync(`SELECT COUNT(*) as count FROM runs;`);
    console.log("🔍 DB: Total rows in runs table:", rowCount[0]?.count || 0);
    
    // Try to read from the table
    if (rowCount[0]?.count > 0) {
      const sampleRow = await db.getAllAsync(`SELECT * FROM runs LIMIT 1;`);
      console.log("🔍 DB: Sample row from runs table:", JSON.stringify(sampleRow[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error("🔍 DB: Error verifying runs table:", error);
    console.error("🔍 DB: Error stack:", error.stack);
    return false;
  }
} 