import Invoice from "../../models/FinanceModel/invoiceModel.js";

// ─── Auth helper ────────────────────────────────────────────────────────────
const isFinanceUser = (user) => {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  if (["admin", "super_admin", "ceo"].includes(role)) return true;
  const code = (user.department?.code || "").toUpperCase();
  const name = (user.department?.name || "").toLowerCase();
  return (
    (role === "manager" || role === "c_level") &&
    (code === "FIN" || name === "finance")
  );
};

// ─── Compute totals from line items ────────────────────────────────────────
const computeTotals = ({ lineItems = [], taxRate = 18, discount = 0 }) => {
  const subtotal  = lineItems.reduce((s, item) => s + (item.quantity * item.unitPrice), 0);
  const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
  const total     = Math.max(0, subtotal + taxAmount - discount);
  return { subtotal, taxAmount, totalAmount: total };
};

// ─── Auto-update invoice status based on amounts & due date ────────────────
const resolveStatus = (invoice) => {
  if (invoice.status === "Cancelled" || invoice.status === "Draft") return invoice.status;
  if (invoice.paidAmount >= invoice.totalAmount) return "Paid";
  if (invoice.paidAmount > 0) return "Partially_Paid";
  if (new Date() > new Date(invoice.dueDate)) return "Overdue";
  return "Issued";
};

// ════════════════════════════════════════════════════════════════════════════
// CREATE INVOICE
// ════════════════════════════════════════════════════════════════════════════
export const createInvoice = async (req, res) => {
  try {
    if (!isFinanceUser(req.user)) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const {
      clientName, clientEmail, clientPhone, clientAddress, clientGST,
      type, department, lineItems, taxRate, discount,
      issueDate, dueDate, paymentMethod, transactionReference,
      notes, internalNotes, budget, status,
    } = req.body;

    if (!clientName) {
      return res.status(400).json({ success: false, message: "Client / Vendor name is required" });
    }
    if (!dueDate) {
      return res.status(400).json({ success: false, message: "Due date is required" });
    }
    if (!lineItems || lineItems.length === 0) {
      return res.status(400).json({ success: false, message: "At least one line item is required" });
    }

    // Normalize line items — compute amounts
    const normalizedItems = lineItems.map((item) => ({
      description: String(item.description).trim(),
      quantity:    Number(item.quantity)  || 1,
      unitPrice:   Number(item.unitPrice) || 0,
      amount:      (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
    }));

    const tRate    = Number(taxRate)   >= 0 ? Number(taxRate)   : 18;
    const tDisc    = Number(discount)  >= 0 ? Number(discount)  : 0;
    const { subtotal, taxAmount, totalAmount } = computeTotals({ lineItems: normalizedItems, taxRate: tRate, discount: tDisc });

    const invoiceData = {
      clientName, clientEmail, clientPhone, clientAddress, clientGST,
      type:         type         || "Payable",
      department:   department   || "Finance",
      lineItems:    normalizedItems,
      subtotal, taxRate: tRate, taxAmount, discount: tDisc, totalAmount,
      paidAmount:   0,
      issueDate:    issueDate || Date.now(),
      dueDate:      new Date(dueDate),
      paymentMethod: paymentMethod || "Bank_Transfer",
      transactionReference: transactionReference || "",
      notes:         notes         || "",
      internalNotes: internalNotes || "",
      budget:        budget        || null,
      createdBy:     req.user._id,
      status:        status        || "Issued",
    };

    const invoice = await Invoice.create(invoiceData);

    const populated = await Invoice.findById(invoice._id)
      .populate("budget", "name fiscalYear")
      .populate("createdBy", "fullName email");

    return res.status(201).json({
      success: true,
      message: `Invoice ${populated.invoiceNumber} created successfully`,
      data: populated,
    });
  } catch (err) {
    console.error("Create Invoice Error:", err);
    return res.status(500).json({ success: false, message: "Failed to create invoice", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// GET ALL INVOICES (with filters + stats)
// ════════════════════════════════════════════════════════════════════════════
export const getInvoices = async (req, res) => {
  try {
    if (!isFinanceUser(req.user)) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { status, type, search, month } = req.query;

    const query = { isDeleted: false };
    if (status && status !== "all") query.status = status;
    if (type   && type   !== "all") query.type   = type;

    if (month && month !== "all") {
      const [yr, mo] = month.split("-");
      const start = new Date(yr, mo - 1, 1);
      const end   = new Date(yr, mo,     1);
      query.issueDate = { $gte: start, $lt: end };
    }

    let invoices = await Invoice.find(query)
      .populate("budget", "name fiscalYear")
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 });

    // Auto-update overdue status
    for (const inv of invoices) {
      const resolved = resolveStatus(inv);
      if (resolved !== inv.status && inv.status !== "Cancelled" && inv.status !== "Draft") {
        inv.status = resolved;
        await inv.save();
      }
    }

    // Text search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      invoices = invoices.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(q) ||
          inv.clientName?.toLowerCase().includes(q)    ||
          inv.department?.toLowerCase().includes(q)    ||
          inv.status?.toLowerCase().includes(q)
      );
    }

    // Aggregate stats
    const all = await Invoice.find({ isDeleted: false });
    const stats = {
      total:          all.length,
      totalAmount:    all.reduce((s, i) => s + (i.totalAmount || 0), 0),
      paidAmount:     all.filter(i => i.status === "Paid").reduce((s, i) => s + i.totalAmount, 0),
      outstanding:    all.filter(i => ["Issued", "Partially_Paid", "Overdue"].includes(i.status)).reduce((s, i) => s + Math.max(0, i.totalAmount - i.paidAmount), 0),
      overdue:        all.filter(i => i.status === "Overdue").length,
      overdueAmount:  all.filter(i => i.status === "Overdue").reduce((s, i) => s + Math.max(0, i.totalAmount - i.paidAmount), 0),
      draft:          all.filter(i => i.status === "Draft").length,
    };

    return res.status(200).json({
      success: true,
      count: invoices.length,
      stats,
      data: invoices,
    });
  } catch (err) {
    console.error("Get Invoices Error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch invoices", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// GET SINGLE INVOICE
// ════════════════════════════════════════════════════════════════════════════
export const getInvoiceById = async (req, res) => {
  try {
    if (!isFinanceUser(req.user)) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false })
      .populate("budget", "name fiscalYear allocatedAmount")
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    return res.status(200).json({ success: true, data: invoice });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch invoice", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// UPDATE INVOICE
// ════════════════════════════════════════════════════════════════════════════
export const updateInvoice = async (req, res) => {
  try {
    if (!isFinanceUser(req.user)) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false });
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    const {
      clientName, clientEmail, clientPhone, clientAddress, clientGST,
      type, department, lineItems, taxRate, discount,
      issueDate, dueDate, status, paymentMethod, transactionReference,
      notes, internalNotes, budget, paidAmount, paidDate,
    } = req.body;

    if (clientName)    invoice.clientName    = clientName;
    if (clientEmail !== undefined) invoice.clientEmail = clientEmail;
    if (clientPhone !== undefined) invoice.clientPhone = clientPhone;
    if (clientAddress !== undefined) invoice.clientAddress = clientAddress;
    if (clientGST !== undefined) invoice.clientGST = clientGST;
    if (type)          invoice.type          = type;
    if (department)    invoice.department    = department;
    if (issueDate)     invoice.issueDate     = new Date(issueDate);
    if (dueDate)       invoice.dueDate       = new Date(dueDate);
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (transactionReference !== undefined) invoice.transactionReference = transactionReference;
    if (notes !== undefined)         invoice.notes         = notes;
    if (internalNotes !== undefined) invoice.internalNotes = internalNotes;
    if (budget !== undefined)        invoice.budget        = budget || null;
    if (paidDate)      invoice.paidDate = new Date(paidDate);

    // Recalculate totals if line items changed
    if (lineItems && lineItems.length > 0) {
      const normalizedItems = lineItems.map((item) => ({
        description: String(item.description).trim(),
        quantity:    Number(item.quantity)  || 1,
        unitPrice:   Number(item.unitPrice) || 0,
        amount:      (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
      }));
      invoice.lineItems = normalizedItems;

      const tRate = taxRate !== undefined  ? Number(taxRate)  : invoice.taxRate;
      const tDisc = discount !== undefined ? Number(discount) : invoice.discount;
      const computed = computeTotals({ lineItems: normalizedItems, taxRate: tRate, discount: tDisc });
      invoice.subtotal    = computed.subtotal;
      invoice.taxRate     = tRate;
      invoice.taxAmount   = computed.taxAmount;
      invoice.discount    = tDisc;
      invoice.totalAmount = computed.totalAmount;
    }

    if (paidAmount !== undefined) {
      invoice.paidAmount = Math.min(Number(paidAmount), invoice.totalAmount);
    }

    // Auto-resolve status unless explicitly set
    if (status) {
      invoice.status = status;
    } else {
      invoice.status = resolveStatus(invoice);
    }

    invoice.updatedBy = req.user._id;
    await invoice.save();

    const updated = await Invoice.findById(invoice._id)
      .populate("budget", "name fiscalYear")
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");

    return res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update Invoice Error:", err);
    return res.status(500).json({ success: false, message: "Failed to update invoice", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// RECORD PAYMENT (partial or full)
// ════════════════════════════════════════════════════════════════════════════
export const recordPayment = async (req, res) => {
  try {
    if (!isFinanceUser(req.user)) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false });
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    const { amount, paymentMethod, transactionReference, paidDate } = req.body;
    const payAmt = Number(amount);

    if (isNaN(payAmt) || payAmt <= 0) {
      return res.status(400).json({ success: false, message: "Payment amount must be positive" });
    }

    const newPaid = Math.min(invoice.totalAmount, invoice.paidAmount + payAmt);
    invoice.paidAmount = newPaid;
    if (paymentMethod)        invoice.paymentMethod        = paymentMethod;
    if (transactionReference) invoice.transactionReference = transactionReference;
    if (paidDate)             invoice.paidDate             = new Date(paidDate);

    invoice.status    = resolveStatus(invoice);
    invoice.updatedBy = req.user._id;
    await invoice.save();

    const updated = await Invoice.findById(invoice._id)
      .populate("budget", "name fiscalYear")
      .populate("createdBy", "fullName email");

    return res.status(200).json({
      success: true,
      message: `Payment of ₹ ${payAmt.toLocaleString("en-IN")} recorded. Status: ${invoice.status}`,
      data: updated,
    });
  } catch (err) {
    console.error("Record Payment Error:", err);
    return res.status(500).json({ success: false, message: "Failed to record payment", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// CANCEL INVOICE
// ════════════════════════════════════════════════════════════════════════════
export const cancelInvoice = async (req, res) => {
  try {
    if (!isFinanceUser(req.user)) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false });
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    if (invoice.status === "Paid") {
      return res.status(400).json({ success: false, message: "Cannot cancel a fully paid invoice" });
    }

    invoice.status    = "Cancelled";
    invoice.updatedBy = req.user._id;
    await invoice.save();

    return res.status(200).json({ success: true, message: "Invoice cancelled", data: invoice });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to cancel invoice", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// SOFT DELETE INVOICE
// ════════════════════════════════════════════════════════════════════════════
export const deleteInvoice = async (req, res) => {
  try {
    if (!isFinanceUser(req.user)) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false });
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    invoice.isDeleted  = true;
    invoice.deletedAt  = new Date();
    invoice.deletedBy  = req.user._id;
    await invoice.save();

    return res.status(200).json({ success: true, message: "Invoice deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to delete invoice", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// GET INVOICE STATS SUMMARY (for dashboard widgets)
// ════════════════════════════════════════════════════════════════════════════
export const getInvoiceStats = async (req, res) => {
  try {
    if (!isFinanceUser(req.user)) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const all = await Invoice.find({ isDeleted: false });

    const byStatus = {};
    const byType   = { Payable: 0, Receivable: 0 };
    let totalAmount = 0, paidAmount = 0, outstanding = 0;

    all.forEach((inv) => {
      byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
      byType[inv.type]     = (byType[inv.type] || 0) + inv.totalAmount;
      totalAmount  += inv.totalAmount || 0;
      paidAmount   += inv.paidAmount  || 0;
      if (["Issued", "Partially_Paid", "Overdue"].includes(inv.status)) {
        outstanding += Math.max(0, inv.totalAmount - inv.paidAmount);
      }
    });

    return res.status(200).json({
      success: true,
      data: { total: all.length, totalAmount, paidAmount, outstanding, byStatus, byType },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to get stats", error: err.message });
  }
};
