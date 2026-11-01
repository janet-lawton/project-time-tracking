const express = require('express');
const router = express.Router();
const db = require('../db');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const requireAdmin = require('../middleware/requireAdmin');

// Generate next invoice number, e.g. INV-0001
function nextInvoiceNumber() {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM invoices`).get();
  const next = row.count + 1;
  return `INV-${String(next).padStart(4, '0')}`;
}

// PREVIEW — what would this invoice include? No writes, no locking.
router.post('/preview', async (req, res) => {
  const { project_id, start_date, end_date } = req.body;
  if (!project_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'project_id, start_date, end_date are required' });
  }

  const project = db.prepare(`
    SELECT p.*, c.currency
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    WHERE p.id = ?
  `).get(project_id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const entries = db.prepare(`
    SELECT te.id, te.date, te.duration_minutes, te.billable,
           t.id AS task_id, t.custom_name, tc.name AS category_name
    FROM time_entries te
    JOIN tasks t ON te.task_id = t.id
    JOIN task_categories tc ON t.category_id = tc.id
    WHERE t.project_id = ?
      AND te.date BETWEEN ? AND ?
      AND te.billable = 1
      AND te.invoice_id IS NULL
      AND te.is_locked = 0
    ORDER BY te.date
  `).all(project_id, start_date, end_date);

  const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0);
  const totalHours = totalMinutes / 60;
  const subtotal = totalHours * project.hourly_rate;

  res.json({
    project_id: project.id,
    project_name: project.name,
    hourly_rate: project.hourly_rate,
    entry_count: entries.length,
    total_hours: Number(totalHours.toFixed(2)),
    subtotal: Number(subtotal.toFixed(2)),
    entries
  });
});

// GENERATE — creates the invoice and locks matching time entries
router.post('/', async (req, res) => {
  const { project_id, start_date, end_date, due_date, notes } = req.body;
  if (!project_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'project_id, start_date, end_date are required' });
  }

  const project = db.prepare(`
    SELECT p.*, c.currency
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    WHERE p.id = ?
  `).get(project_id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const entries = db.prepare(`
    SELECT te.id, te.duration_minutes
    FROM time_entries te
    JOIN tasks t ON te.task_id = t.id
    WHERE t.project_id = ?
      AND te.date BETWEEN ? AND ?
      AND te.billable = 1
      AND te.invoice_id IS NULL
      AND te.is_locked = 0
  `).all(project_id, start_date, end_date);

  if (entries.length === 0) {
    return res.status(400).json({ error: 'No billable, unlocked time entries found in that range' });
  }

  const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0);
  const subtotal = Number(((totalMinutes / 60) * project.hourly_rate).toFixed(2));
  const invoiceNumber = nextInvoiceNumber();

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (project_id, invoice_number, issue_date, due_date, period_start, period_end, status, subtotal, currency, notes)
    VALUES (?, ?, date('now'), ?, ?, ?, 'draft', ?, ?, ?)
  `);
  const lockEntries = db.prepare(`UPDATE time_entries SET invoice_id = ?, is_locked = 1 WHERE id = ?`);

  const createInvoice = db.transaction(() => {
    const result = insertInvoice.run(
      project_id, invoiceNumber, due_date || null, start_date, end_date, subtotal, project.currency, notes || null
    );
    const invoiceId = result.lastInsertRowid;
    for (const e of entries) lockEntries.run(invoiceId, e.id);
    return invoiceId;
  });

  const invoiceId = createInvoice();
  const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
  res.status(201).json(invoice);
});

// LIST — all invoices with client/project info
router.get('/', async (req, res) => {
  const invoices = db.prepare(`
    SELECT i.*, p.name AS project_name, c.name AS client_name, c.email AS client_email
    FROM invoices i
    JOIN projects p ON i.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    ORDER BY i.created_at DESC
  `).all();
  res.json(invoices);
});

// GET ONE — invoice + its line items
router.get('/:id', async (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, p.name AS project_name, c.name AS client_name, c.email AS client_email, c.billing_address
    FROM invoices i
    JOIN projects p ON i.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const lineItems = db.prepare(`
    SELECT te.id, te.date, te.duration_minutes, t.custom_name, tc.name AS category_name
    FROM time_entries te
    JOIN tasks t ON te.task_id = t.id
    JOIN task_categories tc ON t.category_id = tc.id
    WHERE te.invoice_id = ?
    ORDER BY te.date
  `).all(req.params.id);

  res.json({ ...invoice, line_items: lineItems });
});

// DOWNLOAD PDF — generate and return PDF file for download
router.get('/:id/download', async (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, p.name AS project_name, c.name AS client_name, c.email AS client_email, c.billing_address
    FROM invoices i
    JOIN projects p ON i.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const lineItems = db.prepare(`
    SELECT te.date, te.duration_minutes, t.custom_name, tc.name AS category_name
    FROM time_entries te
    JOIN tasks t ON te.task_id = t.id
    JOIN task_categories tc ON t.category_id = tc.id
    WHERE te.invoice_id = ?
    ORDER BY te.date
  `).all(req.params.id);

  const rowsHtml = lineItems.map(item => `
    <tr>
      <td>${item.date}</td>
      <td>${item.category_name}${item.custom_name ? ` (${item.custom_name})` : ''}</td>
      <td style="text-align: right;">${(item.duration_minutes / 60).toFixed(2)}</td>
    </tr>
  `).join('');

  const invoiceHtml = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
          h1 { font-size: 22px; margin-bottom: 0; }
          .meta { margin-bottom: 30px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
          th { background: #f5f5f5; }
          .total { text-align: right; font-size: 16px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Invoice ${invoice.invoice_number}</h1>
        <div class="meta">
          <div><strong>Bill to:</strong> ${invoice.client_name}</div>
          <div>${invoice.billing_address || ''}</div>
          <div><strong>Project:</strong> ${invoice.project_name}</div>
          <div><strong>Period:</strong> ${invoice.period_start} to ${invoice.period_end}</div>
          <div><strong>Issue date:</strong> ${invoice.issue_date}</div>
          ${invoice.due_date ? `<div><strong>Due date:</strong> ${invoice.due_date}</div>` : ''}
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Task</th><th style="text-align: right;">Hours</th></tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="total">Total: ${invoice.currency} ${invoice.subtotal.toFixed(2)}</div>
      </body>
    </html>
  `;

  try {
    const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});
    const page = await browser.newPage();
    await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    res.status(500).json({ error: `Failed to generate PDF: ${err.message}` });
  }
});

// SEND — email the invoice to the client
router.post('/:id/send', requireAdmin, async (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, p.name AS project_name, c.name AS client_name, c.email AS client_email, c.billing_address
    FROM invoices i
    JOIN projects p ON i.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const lineItems = db.prepare(`
    SELECT te.date, te.duration_minutes, t.custom_name, tc.name AS category_name
    FROM time_entries te
    JOIN tasks t ON te.task_id = t.id
    JOIN task_categories tc ON t.category_id = tc.id
    WHERE te.invoice_id = ?
    ORDER BY te.date
  `).all(req.params.id);

  const rowsHtml = lineItems.map(item => `
    <tr>
      <td>${item.date}</td>
      <td>${item.category_name}${item.custom_name ? ` (${item.custom_name})` : ''}</td>
      <td style="text-align: right;">${(item.duration_minutes / 60).toFixed(2)}</td>
    </tr>
  `).join('');

  const invoiceHtml = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
          h1 { font-size: 22px; margin-bottom: 0; }
          .meta { margin-bottom: 30px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
          th { background: #f5f5f5; }
          .total { text-align: right; font-size: 16px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Invoice ${invoice.invoice_number}</h1>
        <div class="meta">
          <div><strong>Bill to:</strong> ${invoice.client_name}</div>
          <div>${invoice.billing_address || ''}</div>
          <div><strong>Project:</strong> ${invoice.project_name}</div>
          <div><strong>Period:</strong> ${invoice.period_start} to ${invoice.period_end}</div>
          <div><strong>Issue date:</strong> ${invoice.issue_date}</div>
          ${invoice.due_date ? `<div><strong>Due date:</strong> ${invoice.due_date}</div>` : ''}
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Task</th><th style="text-align: right;">Hours</th></tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="total">Total: ${invoice.currency} ${invoice.subtotal.toFixed(2)}</div>
      </body>
    </html>
  `;

  try {
    const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
});
    const page = await browser.newPage();
    await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: invoice.client_email,
      subject: `Invoice ${invoice.invoice_number} from ${invoice.project_name}`,
      html: `<p>Hi ${invoice.client_name},</p><p>Please find attached invoice ${invoice.invoice_number} for ${invoice.currency} ${invoice.subtotal.toFixed(2)}, covering ${invoice.period_start} to ${invoice.period_end}.</p>`,
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: pdfBuffer.toString('base64'),
        },
      ],
    });

    if (error) throw new Error(error.message);

    db.prepare(`UPDATE invoices SET status = 'sent' WHERE id = ?`).run(req.params.id);

    res.json({ message: `Invoice sent to ${invoice.client_email}`, status: 'sent' });
  } catch (err) {
    res.status(500).json({ error: `Failed to send invoice: ${err.message}` });
  }
});

// UPDATE STATUS — mark sent/paid/draft
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['draft', 'sent', 'paid'].includes(status)) {
    return res.status(400).json({ error: 'status must be draft, sent, or paid' });
  }
  const result = db.prepare(`UPDATE invoices SET status = ? WHERE id = ?`).run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Invoice not found' });
  res.json(db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(req.params.id));
});

module.exports = router;