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
