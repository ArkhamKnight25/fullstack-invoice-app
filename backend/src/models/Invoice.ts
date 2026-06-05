import mongoose, { Document, Schema, Types } from 'mongoose';

export type InvoiceStatus = 'Sent' | 'Unpaid' | 'Overdue' | 'Paid' | 'Void' | 'Draft';
export type TaxRate = 0 | 3 | 5 | 18 | 28;

export interface IInvoice extends Document {
  invoiceId: string;
  customer: Types.ObjectId;
  customerName: string;
  company: string;
  amount: number;
  taxRate: TaxRate;
  tax: number;
  total: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceId: { type: String, required: true, unique: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    // Denormalized for fast table rendering/sort/search without join on hot list path
    customerName: { type: String, required: true },
    company: { type: String, required: true },
