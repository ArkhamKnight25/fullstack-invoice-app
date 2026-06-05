import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Invoice, computeTaxAndTotal, generateInvoiceId, IInvoice } from '../models/Invoice';
import { Customer } from '../models/Customer';

const router = Router();

// GET /api/invoices — paginated, filterable, sortable
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      sortBy = 'dueDate',
      sortOrder = 'asc',
      status,
      customer,
      issueDateFrom,
      issueDateTo,
      dueDateFrom,
      dueDateTo,
      search,
      taxRate,
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    if (taxRate) {
      const rates = taxRate.split(',').map((r) => parseInt(r.trim(), 10));
      filter.taxRate = rates.length === 1 ? rates[0] : { $in: rates };
    }

    if (customer) {
      if (mongoose.Types.ObjectId.isValid(customer)) {
        filter.customer = new mongoose.Types.ObjectId(customer);
      } else {
        filter.customerName = { $regex: customer, $options: 'i' };
      }
    }

    if (issueDateFrom || issueDateTo) {
      filter.issueDate = {};
      if (issueDateFrom) filter.issueDate.$gte = new Date(issueDateFrom);
      if (issueDateTo) filter.issueDate.$lte = new Date(issueDateTo);
    }

    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {};
      if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
    }

    if (search) {
      filter.$or = [
        { invoiceId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }

    const validSortFields: Record<string, string> = { amount: 'amount', dueDate: 'dueDate' };
    const sortField = validSortFields[sortBy] || 'dueDate';
    const sortDir = sortOrder === 'desc' ? -1 : 1;

    const [data, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ [sortField]: sortDir })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    res.json({
      data,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      sortBy: sortField,
      sortOrder: sortDir === 1 ? 'asc' : 'desc',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findOne({ invoiceId: req.params.id }).populate('customer', 'name company');
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// POST /api/invoices — create
router.post('/', async (req: Request, res: Response) => {
  try {
    const { customer: customerRef, amount, taxRate, issueDate, dueDate, status } = req.body;

    if (!customerRef || amount == null || taxRate == null || !issueDate || !dueDate || !status) {
      res.status(400).json({ error: 'Missing required fields: customer, amount, taxRate, issueDate, dueDate, status' });
      return;
    }

    const amountNum = parseFloat(amount);
    const taxRateNum = parseInt(taxRate, 10);

    if (isNaN(amountNum) || amountNum < 0) {
      res.status(400).json({ error: 'amount must be a non-negative number' });
      return;
    }

    if (![0, 3, 5, 18, 28].includes(taxRateNum)) {
      res.status(400).json({ error: 'taxRate must be one of 0, 3, 5, 18, 28' });
      return;
    }

    const validStatuses = ['Sent', 'Unpaid', 'Overdue', 'Paid', 'Void', 'Draft'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `status must be one of ${validStatuses.join(', ')}` });
      return;
    }

    // Resolve customer
    let customerDoc;
    if (mongoose.Types.ObjectId.isValid(customerRef)) {
      customerDoc = await Customer.findById(customerRef);
    } else {
      customerDoc = await Customer.findOne({ name: { $regex: new RegExp(`^${customerRef}$`, 'i') } });
    }

    if (!customerDoc) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const { tax, total } = computeTaxAndTotal(amountNum, taxRateNum);

    // Generate unique invoiceId
    let invoiceId = generateInvoiceId();
    let attempts = 0;
    while (await Invoice.exists({ invoiceId }) && attempts < 10) {
      invoiceId = generateInvoiceId();
      attempts++;
    }

    const invoice = await Invoice.create({
      invoiceId,
      customer: customerDoc._id,
      customerName: customerDoc.name,
      company: customerDoc.company,
      amount: amountNum,
      taxRate: taxRateNum as 0 | 3 | 5 | 18 | 28,
      tax,
      total,
      status,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
    });

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// PUT /api/invoices/:id — edit
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await Invoice.findOne({ invoiceId: req.params.id });
    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const { customer: customerRef, amount, taxRate, issueDate, dueDate, status } = req.body;

    const updates: Partial<IInvoice> = {};

    // Resolve customer if changing
    if (customerRef !== undefined) {
      let customerDoc;
      if (mongoose.Types.ObjectId.isValid(customerRef)) {
        customerDoc = await Customer.findById(customerRef);
      } else {
        customerDoc = await Customer.findOne({ name: { $regex: new RegExp(`^${customerRef}$`, 'i') } });
      }
      if (!customerDoc) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }
      updates.customer = customerDoc._id as mongoose.Types.ObjectId;
      updates.customerName = customerDoc.name;
      updates.company = customerDoc.company;
    }

    if (amount !== undefined) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum < 0) {
        res.status(400).json({ error: 'amount must be a non-negative number' });
        return;
      }
      updates.amount = amountNum;
    }

    if (taxRate !== undefined) {
      const taxRateNum = parseInt(taxRate, 10);
      if (![0, 3, 5, 18, 28].includes(taxRateNum)) {
        res.status(400).json({ error: 'taxRate must be one of 0, 3, 5, 18, 28' });
        return;
      }
      updates.taxRate = taxRateNum as 0 | 3 | 5 | 18 | 28;
    }

    if (status !== undefined) {
      const validStatuses = ['Sent', 'Unpaid', 'Overdue', 'Paid', 'Void', 'Draft'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `status must be one of ${validStatuses.join(', ')}` });
        return;
      }
      updates.status = status;
    }

    if (issueDate !== undefined) updates.issueDate = new Date(issueDate);
    if (dueDate !== undefined) updates.dueDate = new Date(dueDate);

    // Always recompute tax/total from final amount + taxRate
    const finalAmount = updates.amount ?? existing.amount;
    const finalTaxRate = updates.taxRate ?? existing.taxRate;
    const { tax, total } = computeTaxAndTotal(finalAmount, finalTaxRate);
    updates.tax = tax;
    updates.total = total;

    const updated = await Invoice.findOneAndUpdate(
      { invoiceId: req.params.id },
      { $set: updates },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await Invoice.findOneAndDelete({ invoiceId: req.params.id });
    if (!deleted) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json({ message: 'Invoice deleted', invoiceId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

export default router;


