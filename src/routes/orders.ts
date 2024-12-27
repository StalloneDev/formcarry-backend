import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
});

const orderSchema = z.object({
  items: z.array(orderItemSchema),
});

// Get user orders
router.get('/my-orders', auth, async (req: any, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
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



// Get vendor orders


router.get('/orders', auth, async (req: any, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              vendorId: vendor.id
            }
          }
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export const vendorRouter = router;


// Create order
router.post('/', auth, async (req: any, res) => {
  try {
    const { items } = orderSchema.parse(req.body);

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }

      totalAmount += product.price * item.quantity;
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        totalAmount,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: 'Invalid input data' });
  }
});

// Update order status
router.patch('/:id/status', auth, async (req: any, res) => {
  try {
    const { status } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ error: 'Invalid input data' });
  }
});

export const orderRouter = router;
