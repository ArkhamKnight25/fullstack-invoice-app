import { Router, Request, Response } from 'express';
import { Invoice } from '../models/Invoice';
import { Customer } from '../models/Customer';

const router = Router();

// GET /api/summary — global analytics for Screen 4
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [globalAgg, topCustomersAgg, customerCount] = await Promise.all([
      Invoice.aggregate([
        {
          $group: {
            _id: null,
            totalBilled: { $sum: '$total' },
            totalTax: { $sum: '$tax' },
            invoiceCount: { $sum: 1 },
          },
        },
      ]),
      Invoice.aggregate([
        {
          $group: {
            _id: '$customer',
            name: { $first: '$customerName' },
            company: { $first: '$company' },
            totalValue: { $sum: '$total' },
          },
        },
        { $sort: { totalValue: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            name: 1,
            company: 1,
            totalValue: { $round: ['$totalValue', 2] },
          },
        },
      ]),
      Customer.countDocuments(),
    ]);

    const global = globalAgg[0] || { totalBilled: 0, totalTax: 0, invoiceCount: 0 };

    res.json({
      totalBilled: Math.round(global.totalBilled * 100) / 100,
      totalTax: Math.round(global.totalTax * 100) / 100,
      invoiceCount: global.invoiceCount,
      customerCount,
      topCustomers: topCustomersAgg,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
