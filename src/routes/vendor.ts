import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth, isVendor } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Get vendor details by ID
router.get('/:id', async (req, res) => {
  try {
    const vendor = await prisma.vendor.findFirst({
      where: {
        user: {
          id: req.params.id,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update KKiaPay ID
router.post('/kkiapay', auth, isVendor, async (req: any, res) => {
  try {
    const { kkiapayId } = z.object({
      kkiapayId: z.string(),
    }).parse(req.body);

    const vendor = await prisma.vendor.update({
      where: { userId: req.user.id },
      data: { kkiapayId },
    });

    res.json(vendor);
  } catch (error) {
    res.status(400).json({ error: 'Invalid input data' });
  }
});

// Get vendor orders
router.get('/orders', auth, isVendor, async (req: any, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              vendorId: req.user.id,
            },
          },
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vendor products
router.get('/products', auth, isVendor, async (req: any, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { vendorId: req.user.id },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export const vendorRouter = router;
