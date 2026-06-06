import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Customer } from '../models/Customer';
import { Invoice } from '../models/Invoice';

const router = Router();

// GET /api/customers — list for dropdowns
router.get('/', async (_req: Request, res: Response) => {
  try {
    const customers = await Customer.find({}, { name: 1, company: 1 }).sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:idOrName — full profile with metrics and invoice history
router.get('/:idOrName', async (req: Request, res: Response) => {
  try {
    const idOrName = req.params.idOrName as string;

    let customer;
    if (mongoose.Types.ObjectId.isValid(idOrName) && idOrName.length === 24) {
      customer = await Customer.findById(new mongoose.Types.ObjectId(idOrName));
    } else {
      customer = await Customer.findOne({ name: { $regex: new RegExp(`^${idOrName}$`, 'i') } });
    }

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const OUTSTANDING_STATUSES = ['Sent', 'Unpaid', 'Overdue'];

    const [metricsAgg, invoices] = await Promise.all([
      Invoice.aggregate([
        { $match: { customer: customer._id } },
        {
          $group: {
            _id: null,
            totalBilled: { $sum: '$total' },
            totalTax: { $sum: '$tax' },
            invoiceCount: { $sum: 1 },
            byStatus: {
              $push: '$status',
            },
          },
        },
      ]),
      Invoice.find({ customer: customer._id }).sort({ issueDate: -1 }),
    ]);

    // Build byStatus counts
    const byStatus: Record<string, number> = {
      Paid: 0, Unpaid: 0, Overdue: 0, Draft: 0, Sent: 0, Void: 0,
    };
    let outstanding = 0;

    if (metricsAgg.length > 0) {
      for (const s of metricsAgg[0].byStatus as string[]) {
        byStatus[s] = (byStatus[s] || 0) + 1;
      }
    }

    // Compute outstanding from invoice list (sum totals for outstanding statuses)
    for (const inv of invoices) {
      if (OUTSTANDING_STATUSES.includes(inv.status)) {
        outstanding += inv.total;
      }
    }

    const metrics = metricsAgg.length > 0
      ? {
          totalBilled: Math.round(metricsAgg[0].totalBilled * 100) / 100,
          totalTax: Math.round(metricsAgg[0].totalTax * 100) / 100,
          outstanding: Math.round(outstanding * 100) / 100,
          invoiceCount: metricsAgg[0].invoiceCount,
          byStatus,
        }
      : { totalBilled: 0, totalTax: 0, outstanding: 0, invoiceCount: 0, byStatus };

    res.json({ customer, metrics, invoices });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
});

export default router;



