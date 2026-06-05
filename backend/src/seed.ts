import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Customer } from './models/Customer';
import { Invoice, computeTaxAndTotal } from './models/Invoice';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SEED_PATH = process.env.SEED_PATH || path.join(__dirname, '../../seed-data.json');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/invoice_db';

interface SeedRecord {
  invoiceId: string;
  customer: string;
  company: string;
  amount: number;
  taxRate: number;
  tax: number;
  total: number;
  status: string;
  issueDate: string;
  dueDate: string;
}

export async function runSeed(alreadyConnected = false) {
  if (!alreadyConnected) {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
  }

  const raw = fs.readFileSync(SEED_PATH, 'utf-8');
  const records: SeedRecord[] = JSON.parse(raw);
  console.log(`Loaded ${records.length} records from seed file`);

  await Invoice.deleteMany({});
  await Customer.deleteMany({});
  console.log('Cleared existing collections');

  const customerMap = new Map<string, string>();
  for (const r of records) {
    if (!customerMap.has(r.customer)) customerMap.set(r.customer, r.company);
  }

  const customerDocs = await Customer.insertMany(
    [...customerMap.entries()].map(([name, company]) => ({ name, company }))
  );
  console.log(`Inserted ${customerDocs.length} customers`);

  const nameToId = new Map<string, mongoose.Types.ObjectId>();
  for (const doc of customerDocs) {
    nameToId.set(doc.name, doc._id as mongoose.Types.ObjectId);
  }

  let mismatches = 0;
  const invoiceDocs = records.map((r) => {
    const { tax, total } = computeTaxAndTotal(r.amount, r.taxRate);
    if (Math.abs(tax - r.tax) > 0.02 || Math.abs(total - r.total) > 0.02) {
      mismatches++;
      console.warn(`Mismatch on ${r.invoiceId}: seed tax=${r.tax} computed=${tax}`);
    }
    return {
      invoiceId: r.invoiceId,
      customer: nameToId.get(r.customer),
      customerName: r.customer,
      company: r.company,
      amount: r.amount,
      taxRate: r.taxRate,
      tax,
      total,
      status: r.status,
      issueDate: new Date(r.issueDate),
      dueDate: new Date(r.dueDate),
    };
  });

  await Invoice.insertMany(invoiceDocs, { ordered: false });
  console.log(`Inserted ${invoiceDocs.length} invoices`);
  if (mismatches > 0) console.warn(`${mismatches} tax/total mismatches`);

  if (!alreadyConnected) {
    await mongoose.disconnect();
    console.log('Seed complete. Disconnected.');
  } else {
    console.log('Seed complete.');
  }
}

// Run directly via `npm run seed`
if (require.main === module) {
  runSeed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
