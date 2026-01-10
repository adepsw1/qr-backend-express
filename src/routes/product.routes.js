const express = require('express');
const router = express.Router();
const hybridStorageService = require('../services/hybrid-storage.service');
const { v4: uuidv4 } = require('uuid');

// GET /api/product/vendor/:vendorId - Get all products for a vendor
router.get('/vendor/:vendorId', async (req, res, next) => {
  try {
    const products = await hybridStorageService.queryCollection('products', 'vendorId', '==', req.params.vendorId);
    const sortedProducts = products.sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json({ success: true, data: sortedProducts });
  } catch (err) {
    next(err);
  }
});

// POST /api/product - Create a new product
router.post('/', async (req, res, next) => {
  try {
    const { vendorId, name, price, icon, description, category, isActive } = req.body;
    
    if (!vendorId || !name || !price) {
      return res.status(400).json({ success: false, message: 'Vendor ID, name, and price are required' });
    }

    const productId = uuidv4();
    const product = {
      id: productId,
      vendorId,
      name,
      price,
      icon: icon || '📦',
      description: description || '',
      category: category || 'General',
      isActive: isActive !== false,
      order: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await firebaseService.setDocument('products', productId, product);
    console.log(`[ProductRoutes] ✅ Product created: ${name} for vendor ${vendorId}`);
    
    res.json({ success: true, message: 'Product created successfully', data: product });
  } catch (err) {
    next(err);
  }
});

// PUT /api/product/:productId - Update a product
router.put('/:productId', async (req, res, next) => {
  try {
    const { name, price, icon, description, category, isActive, order } = req.body;
    
    const existing = await hybridStorageService.getDocument('products', req.params.productId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updates = {
      ...existing,
      name: name || existing.name,
      price: price || existing.price,
      icon: icon || existing.icon,
      description: description !== undefined ? description : existing.description,
      category: category || existing.category,
      isActive: isActive !== undefined ? isActive : existing.isActive,
      order: order !== undefined ? order : existing.order,
      updatedAt: new Date().toISOString(),
    };

    await hybridStorageService.updateDocument('products', req.params.productId, updates);
    console.log(`[ProductRoutes] ✅ Product updated: ${req.params.productId}`);
    
    res.json({ success: true, message: 'Product updated successfully', data: updates });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/product/:productId - Delete a product
router.delete('/:productId', async (req, res, next) => {
  try {
    const existing = await hybridStorageService.getDocument('products', req.params.productId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await hybridStorageService.deleteDocument('products', req.params.productId);
    console.log(`[ProductRoutes] ✅ Product deleted: ${req.params.productId}`);
    
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/product/bulk - Create multiple products at once
router.post('/bulk', async (req, res, next) => {
  try {
    const { vendorId, products } = req.body;
    
    if (!vendorId || !products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, message: 'Vendor ID and products array are required' });
    }

    const createdProducts = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const productId = uuidv4();
      const product = {
        id: productId,
        vendorId,
        name: p.name,
        price: p.price,
        icon: p.icon || '📦',
        description: p.description || '',
        category: p.category || 'General',
        isActive: p.isActive !== false,
        order: i,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await hybridStorageService.setDocument('products', productId, product);
      createdProducts.push(product);
    }

    console.log(`[ProductRoutes] ✅ ${createdProducts.length} products created for vendor ${vendorId}`);
    res.json({ success: true, message: `${createdProducts.length} products created`, data: createdProducts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
