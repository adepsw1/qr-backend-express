const firebaseService = require('./firebase.service');
const mysqlService = require('./mysql.service');

/**
 * Hybrid Image Storage Service
 * Stores images in both Firebase Cloud Storage and MySQL
 * Reads from MySQL first, falls back to Firebase
 */
class ImageStorageService {
  /**
   * Upload image to both MySQL and Firebase
   * @param {string} base64Data - Base64 encoded image data
   * @param {string} fileName - Original file name
   * @param {string} folder - Storage folder path
   * @param {string} vendorId - Optional vendor ID for associations
   * @returns {Promise<string>} - Public image URL
   */
  async uploadImage(base64Data, fileName, folder = 'vendor-images', vendorId = null) {
    try {
      const timestamp = Date.now();
      const imageId = timestamp + '-' + Math.random().toString(36).substr(2, 9);

      console.log('[ImageStorage] 📷 Uploading image:', imageId);

      // Remove data URL prefix if present
      const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const imageSizeBytes = base64String.length;

      // 1. Store in MySQL (binary data)
      try {
        await mysqlService.setDocument('vendor_images', imageId, {
          id: imageId,
          fileName: fileName,
          imageData: base64String.substring(0, 5000000), // Store up to ~5MB
          uploadedAt: new Date().toISOString(),
          folder: folder,
          size: imageSizeBytes,
          vendor_id: vendorId,
          status: 'active',
          created_at: new Date().toISOString(),
        });
        console.log('[ImageStorage] ✅ Image stored in MySQL:', imageId);
      } catch (mySQLErr) {
        console.error('[ImageStorage] ⚠️ MySQL storage failed:', mySQLErr.message);
        // Continue to Firebase even if MySQL fails
      }

      // 2. Store in Firebase (parallel)
      let firebaseImageUrl = null;
      try {
        firebaseImageUrl = await firebaseService.uploadImage(base64Data, fileName, folder);
        console.log('[ImageStorage] ✅ Image stored in Firebase:', imageId);
      } catch (firebaseErr) {
        console.error('[ImageStorage] ⚠️ Firebase storage failed:', firebaseErr.message);
        // Continue even if Firebase fails
      }

      // Return API endpoint to retrieve the image
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://qr-backend-express.onrender.com';
      const imageUrl = apiUrl + '/api/vendor/image/' + imageId;

      console.log('[ImageStorage] ✅ Image URL generated:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('[ImageStorage] ❌ Error uploading image:', error.message);
      throw new Error('Image upload failed: ' + error.message);
    }
  }

  /**
   * Retrieve image from MySQL or Firebase
   * @param {string} imageId - Image ID
   * @returns {Promise<Object>} - Image document with base64 data
   */
  async getImage(imageId) {
    try {
      // 1. Try MySQL first (faster)
      try {
        const mysqlImage = await mysqlService.getDocument('vendor_images', imageId);
        if (mysqlImage && mysqlImage.imageData) {
          console.log('[ImageStorage] ✅ Image retrieved from MySQL:', imageId);
          return mysqlImage;
        }
      } catch (mySQLErr) {
        console.log('[ImageStorage] ℹ️ MySQL lookup failed:', mySQLErr.message);
      }

      // 2. Fallback to Firebase
      const firebaseImage = await firebaseService.getDocument('vendor_images', imageId);
      if (firebaseImage && firebaseImage.imageData) {
        console.log('[ImageStorage] ✅ Image retrieved from Firebase:', imageId);

        // Auto-sync to MySQL for future lookups
        try {
          await mysqlService.setDocument('vendor_images', imageId, firebaseImage);
          console.log('[ImageStorage] ✅ Image synced to MySQL:', imageId);
        } catch (syncErr) {
          console.log('[ImageStorage] ℹ️ Auto-sync to MySQL failed:', syncErr.message);
        }

        return firebaseImage;
      }

      console.warn('[ImageStorage] ⚠️ Image not found in MySQL or Firebase:', imageId);
      return null;
    } catch (error) {
      console.error('[ImageStorage] ❌ Error retrieving image:', error.message);
      throw new Error('Image retrieval failed: ' + error.message);
    }
  }

  /**
   * Delete image from both MySQL and Firebase
   * @param {string} imageId - Image ID
   */
  async deleteImage(imageId) {
    try {
      // Delete from MySQL
      try {
        await mysqlService.deleteDocument('vendor_images', imageId);
        console.log('[ImageStorage] ✅ Image deleted from MySQL:', imageId);
      } catch (mySQLErr) {
        console.log('[ImageStorage] ⚠️ MySQL deletion failed:', mySQLErr.message);
      }

      // Delete from Firebase
      try {
        await firebaseService.deleteDocument('vendor_images', imageId);
        console.log('[ImageStorage] ✅ Image deleted from Firebase:', imageId);
      } catch (firebaseErr) {
        console.log('[ImageStorage] ⚠️ Firebase deletion failed:', firebaseErr.message);
      }

      console.log('[ImageStorage] ✅ Image deleted from both stores:', imageId);
    } catch (error) {
      console.error('[ImageStorage] ❌ Error deleting image:', error.message);
      throw new Error('Image deletion failed: ' + error.message);
    }
  }

  /**
   * Get all images for a vendor
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Array>} - Array of image documents
   */
  async getVendorImages(vendorId) {
    try {
      // Query MySQL first
      try {
        const images = await mysqlService.queryCollection('vendor_images', 'vendor_id', '==', vendorId);
        if (images && images.length > 0) {
          console.log('[ImageStorage] ✅ Retrieved', images.length, 'images for vendor from MySQL:', vendorId);
          return images;
        }
      } catch (mySQLErr) {
        console.log('[ImageStorage] ℹ️ MySQL query failed:', mySQLErr.message);
      }

      // Fallback to Firebase
      const firebaseImages = await firebaseService.queryCollection('vendor_images', 'vendor_id', '==', vendorId);
      if (firebaseImages && firebaseImages.length > 0) {
        console.log('[ImageStorage] ✅ Retrieved', firebaseImages.length, 'images for vendor from Firebase:', vendorId);

        // Auto-sync to MySQL
        try {
          for (const image of firebaseImages) {
            await mysqlService.setDocument('vendor_images', image.id, image);
          }
          console.log('[ImageStorage] ✅ Synced', firebaseImages.length, 'images to MySQL');
        } catch (syncErr) {
          console.log('[ImageStorage] ℹ️ Auto-sync failed:', syncErr.message);
        }

        return firebaseImages;
      }

      console.log('[ImageStorage] ℹ️ No images found for vendor:', vendorId);
      return [];
    } catch (error) {
      console.error('[ImageStorage] ❌ Error retrieving vendor images:', error.message);
      throw new Error('Image retrieval failed: ' + error.message);
    }
  }

  /**
   * Migrate all images from Firebase to MySQL
   */
  async migrateAllImagesToMySQL() {
    try {
      console.log('[ImageStorage] 🔄 Starting image migration from Firebase to MySQL...');

      const allImages = await firebaseService.getCollection('vendor_images');
      console.log('[ImageStorage] 📊 Found', allImages.length, 'images in Firebase');

      let migratedCount = 0;
      for (const image of allImages) {
        try {
          await mysqlService.setDocument('vendor_images', image.id, image);
          migratedCount++;
        } catch (err) {
          console.error('[ImageStorage] ❌ Failed to migrate image', image.id, ':', err.message);
        }
      }

      console.log('[ImageStorage] ✅ Migration complete:', migratedCount, '/', allImages.length, 'images migrated');
      return { total: allImages.length, migrated: migratedCount };
    } catch (error) {
      console.error('[ImageStorage] ❌ Error during migration:', error.message);
      throw error;
    }
  }
}

module.exports = new ImageStorageService();
