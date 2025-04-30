/**
 * Converts an ArrayBuffer to a Base64 string using built-in browser functions
 * @param {ArrayBuffer} buffer - The buffer to convert
 * @returns {string} Base64 encoded string
 */
export function arrayBufferToBase64(buffer) {
  // Convert ArrayBuffer to Base64
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
}

/**
 * Converts a Base64 string to an ArrayBuffer
 * @param {string} base64 - Base64 encoded string
 * @returns {ArrayBuffer} - Resulting ArrayBuffer
 */
export function base64ToArrayBuffer(base64) {
  // Convert Base64 to ArrayBuffer
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}