const fs = require('fs');

const routesPath = 'src/routes/vendor.routes.js';
let content = fs.readFileSync(routesPath, 'utf8');

// Add image retrieval endpoint before module.exports
const newEndpoint = `
// GET /api/images/:imageId - Retrieve stored image
router.get('/image/:imageId', async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const firebaseService = require('../services/firebase.service');
    
    const imageDoc = await firebaseService.getDocument('vendor_images', imageId);
    
    if (!imageDoc || !imageDoc.imageData) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    
    // Return as data URL in JSON response
    const dataUrl = 'data:image/jpeg;base64,' + imageDoc.imageData;
    res.json({ success: true, data: { imageUrl: dataUrl } });
  } catch (err) {
    console.error('[Image Retrieval] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve image' });
  }
});
`;

// Find the module.exports and add before it
const moduleExportIndex = content.lastIndexOf('module.exports');
if (moduleExportIndex > -1) {
  content = content.substring(0, moduleExportIndex) + newEndpoint + '\n' + content.substring(moduleExportIndex);
  fs.writeFileSync(routesPath, content, 'utf8');
  console.log('✅ Added image retrieval endpoint');
} else {
  console.log('❌ Could not find module.exports');
}
