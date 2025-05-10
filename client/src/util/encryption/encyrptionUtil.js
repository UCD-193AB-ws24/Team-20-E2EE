import { encode, decode } from 'base64-arraybuffer';

/**
 * Converts an ArrayBuffer to a Base64 string
 * @param {ArrayBuffer} buffer - The buffer to convert
 * @returns {string} Base64 encoded string
 */
export function arrayBufferToBase64(buffer) {
  try {
    // Handle TypedArrays (like Uint8Array)
    if (buffer && typeof buffer === 'object' && 'buffer' in buffer) {
      return buffer.buffer instanceof ArrayBuffer ? encode(buffer.buffer) : '';
    }
    // Handle ArrayBuffers
    return encode(buffer);
  } catch (error) {
    console.error("Error encoding ArrayBuffer to Base64:", error);
    return '';
  }
}

/**
 * Converts a Base64 string to an ArrayBuffer
 * @param {string} base64 - Base64 encoded string
 * @returns {ArrayBuffer} - Resulting ArrayBuffer
 */
export function base64ToArrayBuffer(base64) {
  try {
    return decode(base64);
  } catch (error) {
    console.error("Error decoding Base64 to ArrayBuffer:", error);
    return new ArrayBuffer(0);
  }
}