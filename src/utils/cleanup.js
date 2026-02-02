import fs from 'fs';

/**
 * Deletes a file from the filesystem
 * @param {string} filePath - Path to the file to delete
 */
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to delete temp file ${filePath}:`, error.message);
  }
}

export default { deleteFile };
