const { v2: cloudinary } = require('cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Delete user folder by UID
async function deleteUserFolder(uid) {
  try {
    console.log(`Deleting folder: users/${uid}/`);
    
    // Delete all resources in the folder
    const deleteResult = await cloudinary.api.delete_resources_by_prefix(`users/${uid}/`);
    console.log('Resources deleted:', deleteResult);
    
    // Delete the folder itself
    const folderResult = await cloudinary.api.delete_folder(`users/${uid}`);
    console.log('Folder deleted:', folderResult);
    
    console.log('✅ Cleanup completed successfully');
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
}

// Usage: node cleanup-cloudinary.js <USER_UID>
const uid = process.argv[2];
if (!uid) {
  console.error('Please provide a user UID as argument');
  console.log('Usage: node cleanup-cloudinary.js <USER_UID>');
  process.exit(1);
}

deleteUserFolder(uid);
