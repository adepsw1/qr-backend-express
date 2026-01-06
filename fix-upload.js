const fs = require('fs');

const filePath = 'src/services/firebase.service.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the uploadImage function with a simple placeholder version
const newUploadImage = `  async uploadImage(base64Data, fileName, folder = 'vendor-images') {
    try {
      const timestamp = Date.now();
      const imageId = timestamp + '-' + Math.random().toString(36).substr(2, 9);
      
      console.log('[FirebaseService] 📷 Image ID:', imageId);
      
      // Return a temporary placeholder URL while bucket issue is resolved
      const placeholderUrl = 'https://via.placeholder.com/800x600?text=' + encodeURIComponent(fileName);
      console.log('[FirebaseService] ✅ Image URL:', placeholderUrl);
      return placeholderUrl;
    } catch (error) {
      console.error('[FirebaseService] Error:', error.message);
      throw new Error('Image upload failed: ' + error.message);
    }
  }`;

// Find and replace the old uploadImage function
const uploadImageRegex = /async uploadImage\(base64Data, fileName, folder = 'vendor-images'\) \{[\s\S]*?\n  \}/;
const updated = content.replace(uploadImageRegex, newUploadImage);

fs.writeFileSync(filePath, updated, 'utf8');
console.log('✅ Updated uploadImage function with placeholder');
