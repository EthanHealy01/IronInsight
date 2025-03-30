/**
 * Converts a weight value from kg to the user's preferred unit and formats it as a string
 * @param {number} weightInKg - The weight value in kilograms
 * @param {string} preferredUnit - The user's preferred unit ("kg" or "lbs")
 * @param {number} decimals - Number of decimal places to display (default: 2)
 * @returns {string} Formatted weight string with unit (e.g., "100 kg" or "225 lbs")
 */
export const parseWeight = (weightInKg, preferredUnit = 'kg', decimals = 2) => {
  if (weightInKg === null || weightInKg === undefined || isNaN(weightInKg)) {
    return '0.00 ' + preferredUnit;
  }

  // Convert to lbs if needed
  const value = preferredUnit === 'lbs' ? weightInKg * 2.20462 : weightInKg;
  
  // Format the number with the specified decimal places
  const formattedValue = value.toFixed(decimals);
  
  // Remove trailing zeros after decimal point if needed
  const displayValue = parseFloat(formattedValue);
  
  // Return formatted string with appropriate unit
  return `${displayValue} ${preferredUnit}`;
};

/**
 * Converts a weight value (stored in kg) to the user's preferred unit without formatting
 * Useful for calculations where you need the numeric value only
 * @param {number} weightInKg - The weight value in kilograms
 * @param {string} preferredUnit - The user's preferred unit ("kg" or "lbs")
 * @returns {number} Weight value in the preferred unit
 */
export const convertWeight = (weightInKg, preferredUnit = 'kg') => {
  if (weightInKg === null || weightInKg === undefined || isNaN(Number(weightInKg))) {
    return 0;
  }
  
  // Ensure we're working with a number
  const weight = Number(weightInKg);
  
  // Convert to preferred unit (default to kg)
  return preferredUnit === 'lbs' ? weight * 2.20462 : weight;
}; 