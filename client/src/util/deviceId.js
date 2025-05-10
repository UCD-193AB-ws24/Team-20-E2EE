/**
 * Generates and manages device IDs for the current device
 */

const DEVICE_ID_KEY = 'e2ee-device-id';

/**
 * Gets the current device ID or generates a new one if none exists
 * @returns {string} The device ID
 */
export function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Generates a new random device ID
 * @returns {string} A new device ID
 */
function generateDeviceId() {
  // Generate a random ID with timestamp to ensure uniqueness
  const randomPart = Math.random().toString(36).substring(2, 15);
  const timestampPart = Date.now().toString(36);
  return `${randomPart}-${timestampPart}`;
}