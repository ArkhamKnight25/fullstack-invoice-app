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
    amount: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, enum: [0, 3, 5, 18, 28] },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ['Sent', 'Unpaid', 'Overdue', 'Paid', 'Void', 'Draft'],
      index: true,
    },
    issueDate: { type: Date, required: true, index: true },
    dueDate: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// Compound index for amount sorting on filtered queries
InvoiceSchema.index({ amount: 1 });
InvoiceSchema.index({ customerName: 1 });

export function computeTaxAndTotal(amount: number, taxRate: number): { tax: number; total: number } {
  const tax = Math.round(amount * taxRate) / 100;
  const total = Math.round((amount + tax) * 100) / 100;
  return { tax, total };
}

export function generateInvoiceId(): string {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return `INV-${digits}`;
}

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
