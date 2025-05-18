/**
 * Utility function to clear all application storage (IndexedDB and localStorage)
 * @returns {Promise<void>} A promise that resolves when storage is cleared
 */
export const clearAllStorage = async () => {
  try {
    // Clear localStorage
    localStorage.clear();
    console.log('localStorage cleared successfully');
    
    // Clear IndexedDB databases
    const databases = await window.indexedDB.databases();
    
    // Create an array of promises for deleting each database
    const deletePromises = databases.map(db => {
      return new Promise((resolve, reject) => {
        const deleteRequest = window.indexedDB.deleteDatabase(db.name);
        
        deleteRequest.onsuccess = () => {
          console.log(`IndexedDB database '${db.name}' deleted successfully`);
          resolve();
        };
        
        deleteRequest.onerror = () => {
          console.error(`Error deleting IndexedDB database '${db.name}'`);
          reject(new Error(`Failed to delete database ${db.name}`));
        };
      });
    });
    
    // Wait for all databases to be deleted
    await Promise.all(deletePromises);
    
    console.log('All storage cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
};