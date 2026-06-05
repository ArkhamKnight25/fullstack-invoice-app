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
