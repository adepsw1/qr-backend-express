const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

class FirebaseService {
  constructor() {
    this.db = null;
    this.auth = null;
    this.mockDatabase = new Map();
    this.useMockDatabase = false;
    this.initializeFirebase();
  }

  initializeFirebase() {
    // Try to load from environment variable first (for Hostinger deployment)
    let serviceAccount = null;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (serviceAccountJson && serviceAccountJson !== '{}' && serviceAccountJson.trim() !== '') {
      try {
        serviceAccount = JSON.parse(serviceAccountJson);
        console.log('[FirebaseService] 📦 Loaded credentials from ENV');
      } catch (e) {
        console.log('[FirebaseService] ⚠️  Failed to parse ENV:', e.message);
      }
    }
    
    // Fallback to JSON file if it exists
    if (!serviceAccount) {
      const jsonFilePath = path.join(__dirname, 'firebase-service-account.json');
      if (fs.existsSync(jsonFilePath)) {
        try {
          serviceAccount = require(jsonFilePath);
          console.log('[FirebaseService] 📦 Loaded credentials from JSON file');
        } catch (e) {
          console.log('[FirebaseService] ⚠️  Failed to load JSON file:', e.message);
        }
      }
    }

    if (!serviceAccount) {
      console.log('[FirebaseService] ℹ️  No Firebase credentials, using mock database');
      this.useMockDatabase = true;
      return;
    }

    if (!admin.apps.length) {
      try {
        console.log('[FirebaseService] 📦 Connecting to project:', serviceAccount.project_id);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`,
        });
        this.db = admin.firestore();
        this.auth = admin.auth();
        this.bucket = admin.storage().bucket();
        console.log('[FirebaseService] ✅ Firestore initialized successfully');
        console.log('[FirebaseService] ✅ Cloud Storage initialized successfully');
      } catch (error) {
        console.warn('[FirebaseService] ⚠️  Firebase init failed:', error.message);
        this.useMockDatabase = true;
      }
    } else {
      this.db = admin.firestore();
      this.auth = admin.auth();
      this.bucket = admin.storage().bucket();
      console.log('[FirebaseService] ✅ Using existing Firebase app');
    }
  }

  async createDocument(collection, data) {
    if (this.useMockDatabase) {
      const id = require('uuid').v4();
      if (!this.mockDatabase.has(collection)) {
        this.mockDatabase.set(collection, new Map());
      }
      this.mockDatabase.get(collection).set(id, { id, ...data });
      return id;
    }
    const docRef = await this.db.collection(collection).add(data);
    return docRef.id;
  }

  async setDocument(collection, id, data) {
    if (this.useMockDatabase) {
      if (!this.mockDatabase.has(collection)) {
        this.mockDatabase.set(collection, new Map());
      }
      this.mockDatabase.get(collection).set(id, { id, ...data });
      return;
    }
    try {
      await this.db.collection(collection).doc(id).set(data);
      console.log(`[FirebaseService] ✅ Document set: ${collection}/${id}`);
    } catch (error) {
      console.error(`[FirebaseService] 🔴 CRITICAL: setDocument FAILED for ${collection}/${id}`);
      console.error(`[FirebaseService] Error Code: ${error.code}`);
      console.error(`[FirebaseService] Error Message: ${error.message}`);
      console.error(`[FirebaseService] Full Error:`, error);
      throw error; // Don't silently fail - throw the error
    }
  }

  async getDocument(collection, id) {
    if (this.useMockDatabase) {
      return this.mockDatabase.get(collection)?.get(id) || null;
    }
    const doc = await this.db.collection(collection).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async getCollection(collection, limit = 100) {
    if (this.useMockDatabase) {
      const docs = Array.from(this.mockDatabase.get(collection)?.values() || []);
      console.log(`[FirebaseService] ✅ Retrieved ${docs.length} docs from mock: ${collection}`);
      return docs.slice(0, limit);
    }
    try {
      const snapshot = await this.db.collection(collection).limit(limit).get();
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`[FirebaseService] ✅ Retrieved ${docs.length} docs from Firestore: ${collection}`);
      return docs;
    } catch (error) {
      console.warn(`[FirebaseService] ⚠️  getCollection failed: ${error.message}`);
      this.useMockDatabase = true;
      return Array.from(this.mockDatabase.get(collection)?.values() || []).slice(0, limit);
    }
  }

  async queryCollection(collection, field, operator, value) {
    if (this.useMockDatabase) {
      const docs = Array.from(this.mockDatabase.get(collection)?.values() || []);
      return docs.filter(doc => {
        if (operator === '==') return doc[field] === value;
        if (operator === '<') return doc[field] < value;
        if (operator === '>') return doc[field] > value;
        if (operator === '<=') return doc[field] <= value;
        if (operator === '>=') return doc[field] >= value;
        if (operator === '!=') return doc[field] !== value;
        return false;
      });
    }
    try {
      const snapshot = await this.db.collection(collection).where(field, operator, value).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn(`[FirebaseService] ⚠️  queryCollection failed: ${error.message}`);
      this.useMockDatabase = true;
      const docs = Array.from(this.mockDatabase.get(collection)?.values() || []);
      return docs.filter(doc => {
        if (operator === '==') return doc[field] === value;
        return false;
      });
    }
  }

  async updateDocument(collection, id, data) {
    if (this.useMockDatabase) {
      const existing = this.mockDatabase.get(collection)?.get(id);
      if (existing) {
        this.mockDatabase.get(collection).set(id, { ...existing, ...data });
      }
      return;
    }
    try {
      await this.db.collection(collection).doc(id).update(data);
      console.log(`[FirebaseService] ✅ Document updated: ${collection}/${id}`);
    } catch (error) {
      console.error(`[FirebaseService] 🔴 CRITICAL: updateDocument FAILED for ${collection}/${id}`);
      console.error(`[FirebaseService] Error: ${error.message}`);
      throw error;
    }
  }

  async deleteDocument(collection, id) {
    if (this.useMockDatabase) {
      this.mockDatabase.get(collection)?.delete(id);
      return;
    }
    try {
      await this.db.collection(collection).doc(id).delete();
      console.log(`[FirebaseService] ✅ Document deleted: ${collection}/${id}`);
    } catch (error) {
      console.error(`[FirebaseService] 🔴 CRITICAL: deleteDocument FAILED for ${collection}/${id}`);
      console.error(`[FirebaseService] Error: ${error.message}`);
      throw error;
    }
  }

  // Clear all data from a collection
  async clearCollection(collection) {
    if (this.useMockDatabase) {
      this.mockDatabase.set(collection, new Map());
      console.log(`[FirebaseService] 🗑️ Cleared mock collection: ${collection}`);
      return;
    }
    const snapshot = await this.db.collection(collection).get();
    const batch = this.db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`[FirebaseService] 🗑️ Cleared Firestore collection: ${collection}`);
  }

  // Clear all collections
  async clearAllData() {
    const collections = ['vendors', 'customers', 'offers', 'redemptions', 'vendor_offer_actions', 'otp_verifications', 'broadcasts'];
    for (const col of collections) {
      await this.clearCollection(col);
    }
    console.log('[FirebaseService] 🗑️ All data cleared!');
  }

  // Get stats about stored data
  getDataStats() {
    if (this.useMockDatabase) {
      const stats = {};
      this.mockDatabase.forEach((value, key) => {
        stats[key] = value.size;
      });
      return stats;
    }
    return { message: 'Using Firestore - check Firebase console' };
  }

  // Upload image to Cloud Storage and return public URL
  async uploadImage(base64Data, fileName, folder = 'vendor-images') {
    try {
      // If using mock database, return a placeholder URL
      if (this.useMockDatabase || !this.bucket) {
        const placeholderUrl = `https://via.placeholder.com/300?text=${encodeURIComponent(fileName)}`;
        console.log(`[FirebaseService] 📷 Using placeholder URL (no Cloud Storage): ${placeholderUrl}`);
        return placeholderUrl;
      }

      // Remove data URL prefix if present (data:image/jpeg;base64,...)
      const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      
      // Decode base64 to buffer
      const buffer = Buffer.from(base64String, 'base64');
      
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileNameWithTime = `${timestamp}-${fileName.replace(/\s+/g, '_')}`;
      const filePath = `${folder}/${fileNameWithTime}`;
      
      // Create file reference and upload
      const file = this.bucket.file(filePath);
      
      await new Promise((resolve, reject) => {
        const writeStream = file.createWriteStream({
          metadata: {
            contentType: 'image/jpeg',
          },
        });
        
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        writeStream.end(buffer);
      });

      // Generate signed URL (7 days expiration)
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      console.log(`[FirebaseService] ✅ Image uploaded: ${filePath}`);
      return url;
    } catch (error) {
      console.error(`[FirebaseService] 🔴 Image upload failed:`, error.message);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }
}

module.exports = new FirebaseService();
