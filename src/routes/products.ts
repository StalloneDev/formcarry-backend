import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth, isVendor } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  price: z.number().positive(),
  image: z.string().url(),
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
      },
    });
    res.json(products);
  } catch (error: any) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error: any) {
    console.error('Error getting product:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Create product (vendor only)
router.post('/', auth, isVendor, async (req: any, res) => {
  try {
    console.log('Request headers:', req.headers);
    console.log('Request user:', req.user);
    console.log('Received product data:', req.body);
    
    const productData = productSchema.parse(req.body);
    console.log('Validated product data:', productData);
    console.log('User ID:', req.user.id);

    const product = await prisma.product.create({
      data: {
        ...productData,
        vendorId: req.user.id,
      },
    });

    console.log('Created product:', product);
    res.status(201).json(product);
  } catch (error: any) {
    console.error('Error creating product:', error);
    console.error('Error details:', error.errors || error.message);
    res.status(400).json({ 
      error: 'Invalid input data', 
      details: error.message,
      validation: error.errors
    });
  }
});

// Update product (vendor only)
router.put('/:id', auth, isVendor, async (req: any, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.vendorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const productData = productSchema.parse(req.body);

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: productData,
    });

    res.json(updatedProduct);
  } catch (error: any) {
    console.error('Error updating product:', error);
    res.status(400).json({ error: 'Invalid input data', details: error.message });
  }
});

// Delete product (vendor only)
router.delete('/:id', auth, isVendor, async (req: any, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.vendorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.product.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

export const productRouter = router;
