const fs = require('fs');

const filePath = 'src/services/firebase.service.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the uploadImage function to actually store the image data
const newUploadImage = `  async uploadImage(base64Data, fileName, folder = 'vendor-images') {
    try {
      const timestamp = Date.now();
      const imageId = timestamp + '-' + Math.random().toString(36).substr(2, 9);
      
      console.log('[FirebaseService] 📷 Storing image:', imageId);
      
      // Remove data URL prefix if present
      const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      
      // Store in Firestore with base64 data
      if (this.db && !this.useMockDatabase) {
        await this.db.collection('vendor_images').doc(imageId).set({
          id: imageId,
          fileName: fileName,
          imageData: base64String.substring(0, 1000000), // Store up to 1MB
          uploadedAt: new Date(),
          folder: folder,
          size: base64String.length,
        });
        console.log('[FirebaseService] ✅ Image stored in Firestore');
      }
      
      // Return API endpoint to retrieve the image
      const imageUrl = process.env.NEXT_PUBLIC_API_URL + '/api/images/' + imageId;
      console.log('[FirebaseService] ✅ Image URL:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('[FirebaseService] Error:', error.message);
      throw new Error('Image upload failed: ' + error.message);
    }
  }`;

// Find and replace
const uploadImageRegex = /async uploadImage\(base64Data, fileName, folder = 'vendor-images'\) \{[\s\S]*?\n  \}/;
const updated = content.replace(uploadImageRegex, newUploadImage);

fs.writeFileSync(filePath, updated, 'utf8');
console.log('✅ Updated uploadImage to store actual images');
