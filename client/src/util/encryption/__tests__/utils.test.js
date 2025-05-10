// Import the functions to test from the utils file
import { arrayBufferToBase64, base64ToArrayBuffer } from '../utils';

describe('Encoding Utilities', () => {
  describe('arrayBufferToBase64', () => {
    it('should correctly convert ArrayBuffer to Base64', () => {
      // Arrange
      const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello" in ASCII
      
      // Act
      const base64 = arrayBufferToBase64(buffer);
      
      // Assert
      expect(base64).toBe('SGVsbG8=');
    });
  });
  
  describe('base64ToArrayBuffer', () => {
    it('should correctly convert Base64 to ArrayBuffer', () => {
      // Arrange
      const base64 = 'SGVsbG8='; // "Hello" in Base64
      
      // Act
      const buffer = base64ToArrayBuffer(base64);
      const view = new Uint8Array(buffer);
      
      // Assert
      expect(Array.from(view)).toEqual([72, 101, 108, 108, 111]);
    });
  });
  
  it('should correctly round-trip convert between ArrayBuffer and Base64', () => {
    // Arrange
    const originalBuffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    
    // Act
    const base64 = arrayBufferToBase64(originalBuffer);
    const resultBuffer = base64ToArrayBuffer(base64);
    
    // Assert
    const originalView = new Uint8Array(originalBuffer);
    const resultView = new Uint8Array(resultBuffer);
    
    expect(Array.from(resultView)).toEqual(Array.from(originalView));
  });
});