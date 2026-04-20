import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Banknote,
  CheckCircle,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Globe,
  Plus,
  Printer,
  Send,
} from 'lucide-react';
import { DataTable } from '@/components/ui-custom/DataTable';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { mockApi } from '@/services/mockApi';
import type { Invoice, Order } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatLKR } from '@/lib/currency';

type ReceiptType = 'print' | 'digital';

const statusFilters = [
  { id: 'all', label: 'All Invoices' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending' },
  { id: 'overdue', label: 'Overdue' },
] as const;

const paymentMethods = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'online', label: 'Digital', icon: Globe },
] as const;

export function Billing() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [vatRate, setVatRate] = useState(8);
  const [serviceChargeRate, setServiceChargeRate] = useState(5);
  const [discountRate, setDiscountRate] = useState(0);
  const [receiptType, setReceiptType] = useState<ReceiptType>('digital');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const [invoiceData, orderData, transactionData] = await Promise.all([
        mockApi.getInvoices(),
        mockApi.getOrders(),
        mockApi.getTransactionHistory(),
      ]);
      setInvoices(invoiceData);
      setOrders(orderData);
      setTransactions(transactionData);
      if (!selectedOrderId && orderData.length > 0) {
        const defaultOrder = orderData.find((order) => !invoiceData.some((invoice) => invoice.orderId === order.id));
        if (defaultOrder) setSelectedOrderId(defaultOrder.id);
      }
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const billableOrders = useMemo(() => {
    return orders.filter((order) => !invoices.some((invoice) => invoice.orderId === order.id));
  }, [orders, invoices]);

  const selectedOrder = useMemo(() => {
    return billableOrders.find((order) => order.id === selectedOrderId) || null;
  }, [billableOrders, selectedOrderId]);

  const generatedPreview = useMemo(() => {
    if (!selectedOrder) {
      return {
        subtotal: 0,
        discountAmount: 0,
        serviceChargeAmount: 0,
        taxAmount: 0,
        total: 0,
      };
    }

    const subtotal = selectedOrder.total;
    const discountAmount = Number(((subtotal * discountRate) / 100).toFixed(2));
    const discountedSubtotal = subtotal - discountAmount;
    const serviceChargeAmount = Number(((discountedSubtotal * serviceChargeRate) / 100).toFixed(2));
    const taxAmount = Number((((discountedSubtotal + serviceChargeAmount) * vatRate) / 100).toFixed(2));
    const total = Number((discountedSubtotal + serviceChargeAmount + taxAmount).toFixed(2));

    return {
      subtotal,
      discountAmount,
      serviceChargeAmount,
      taxAmount,
      total,
    };
  }, [selectedOrder, discountRate, serviceChargeRate, vatRate]);

  const filteredInvoices = activeFilter === 'all'
    ? invoices
    : invoices.filter((invoice) => invoice.status === activeFilter);

  const totalRevenue = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const pendingAmount = invoices
    .filter((invoice) => invoice.status === 'pending')
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const overdueAmount = invoices
    .filter((invoice) => invoice.status === 'overdue')
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const handleGenerateBill = async () => {
    if (!selectedOrderId) {
      alert('Please select an order to generate bill.');
      return;
    }

    try {
      await mockApi.generateInvoiceFromOrder(selectedOrderId, {
        vatRate,
        serviceChargeRate,
        discountRate,
        receiptType,
      });
      setShowGenerateModal(false);
      await loadBillingData();
    } catch (error) {
      console.error('Failed to generate bill:', error);
      alert('Unable to generate bill for selected order.');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedInvoice) return;

    try {
      await mockApi.updateInvoiceStatus(selectedInvoice.id, 'paid', selectedPaymentMethod);
      await loadBillingData();
      setShowPaymentModal(false);
      setShowInvoiceModal(false);
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    }
  };

  const handleReceiptAction = (action: 'print' | 'digital') => {
    if (!selectedInvoice) return;
    const actionLabel = action === 'print' ? 'Print' : 'Digital send';
    alert(`${actionLabel} initiated for receipt ${selectedInvoice.receiptNumber || selectedInvoice.id}.`);
  };

  const columns = [
    {
      key: 'id',
      header: 'Invoice ID',
      render: (invoice: Invoice) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-[#151515]">{invoice.id}</p>
            <p className="text-xs text-gray-500">{invoice.receiptNumber || '-'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (invoice: Invoice) => (
        <div>
          <p className="font-medium text-gray-700">{invoice.customerName}</p>
          <p className="text-sm text-gray-500">Order {invoice.orderId}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Bill',
      render: (invoice: Invoice) => (
        <div>
          <p className="font-semibold text-[#151515]">{formatLKR(invoice.total)}</p>
          <p className="text-xs text-gray-500">
            Tax {formatLKR(invoice.tax)} | Discount {formatLKR(Number(invoice.discountAmount || 0))}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (invoice: Invoice) => <StatusBadge status={invoice.status} />,
    },
    {
      key: 'paymentMethod',
      header: 'Payment',
      render: (invoice: Invoice) => (
        invoice.paymentMethod ? (
          <span className="capitalize text-gray-600">{invoice.paymentMethod}</span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (invoice: Invoice) => <span className="text-gray-500">{format(invoice.createdAt, 'MMM d, yyyy')}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[#ff5a65] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-[#151515]">Billing & Payment Module</h2>
          <p className="text-gray-500">Auto-generate bills, process payments, and keep auditable transaction history</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ff5a65] text-white rounded-xl hover:bg-[#ff5a65]/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Generate Bill
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Collected</span>
          </div>
          <p className="text-gray-500 text-sm">Total Revenue</p>
          <p className="text-3xl font-bold text-[#151515]">{formatLKR(totalRevenue)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Pending</span>
          </div>
          <p className="text-gray-500 text-sm">Pending Payments</p>
          <p className="text-3xl font-bold text-[#151515]">{formatLKR(pendingAmount)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded-full">Overdue</span>
          </div>
          <p className="text-gray-500 text-sm">Overdue Amount</p>
          <p className="text-3xl font-bold text-[#151515]">{formatLKR(overdueAmount)}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2"
      >
        {statusFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300',
              activeFilter === filter.id
                ? 'bg-[#151515] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-[#ff5a65]/30'
            )}
          >
            {filter.label}
          </button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        <div className="xl:col-span-2">
          <DataTable
            data={filteredInvoices}
            columns={columns}
            keyExtractor={(invoice) => invoice.id}
            onView={(invoice) => {
              setSelectedInvoice(invoice);
              setShowInvoiceModal(true);
            }}
            searchKeys={['id', 'customerName', 'orderId', 'receiptNumber']}
            pageSize={10}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-lg font-bold text-[#151515]">Transaction History</h3>
          <p className="text-xs text-gray-500 mb-4">Auditable paid transactions</p>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {transactions.length === 0 && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">No completed transactions yet.</p>
            )}

            {transactions.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-[#151515]">{entry.id}</p>
                  <p className="font-semibold text-emerald-700">{formatLKR(entry.total)}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">{entry.customerName} | {entry.paymentMethod || '-'}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {entry.paidAt ? format(entry.paidAt, 'MMM d, yyyy h:mm a') : format(entry.createdAt, 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowGenerateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-[#151515]">Bill Generation</h3>
                <p className="text-gray-500">Auto-generate invoice from order with tax and discounts</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Order</label>
                  <select
                    value={selectedOrderId}
                    onChange={(event) => setSelectedOrderId(event.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  >
                    <option value="">Choose billable order</option>
                    {billableOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.id} - {order.customerName} ({formatLKR(order.total)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">VAT (%)</label>
                    <input
                      type="number"
                      value={vatRate}
                      onChange={(event) => setVatRate(Number(event.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Charge (%)</label>
                    <input
                      type="number"
                      value={serviceChargeRate}
                      onChange={(event) => setServiceChargeRate(Number(event.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                    <input
                      type="number"
                      value={discountRate}
                      onChange={(event) => setDiscountRate(Number(event.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Mode</label>
                  <select
                    value={receiptType}
                    onChange={(event) => setReceiptType(event.target.value as ReceiptType)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  >
                    <option value="digital">Digital Receipt</option>
                    <option value="print">Print Receipt</option>
                  </select>
                </div>

                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                  <p className="font-semibold text-[#151515] mb-2">Bill Preview</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatLKR(generatedPreview.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>- {formatLKR(generatedPreview.discountAmount)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Service Charge</span><span>{formatLKR(generatedPreview.serviceChargeAmount)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">VAT</span><span>{formatLKR(generatedPreview.taxAmount)}</span></div>
                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold text-[#151515]"><span>Total</span><span>{formatLKR(generatedPreview.total)}</span></div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600">
                  Cancel
                </button>
                <button onClick={handleGenerateBill} className="px-4 py-2 bg-[#ff5a65] text-white rounded-xl">
                  Generate Invoice
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInvoiceModal && selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowInvoiceModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#151515]">{selectedInvoice.id}</h3>
                  <p className="text-gray-500">Receipt {selectedInvoice.receiptNumber || '-'}</p>
                </div>
                <StatusBadge status={selectedInvoice.status} />
              </div>

              <div className="p-6">
                <div className="mb-5">
                  <p className="font-medium text-[#151515]">{selectedInvoice.customerName}</p>
                  <p className="text-gray-500 text-sm">Order {selectedInvoice.orderId}</p>
                  <p className="text-gray-500 text-sm">{format(selectedInvoice.createdAt, 'MMMM d, yyyy h:mm a')}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-5">
                  <div className="flex justify-between mb-2"><span className="text-gray-500">Subtotal</span><span>{formatLKR(selectedInvoice.amount)}</span></div>
                  <div className="flex justify-between mb-2"><span className="text-gray-500">Discount</span><span>- {formatLKR(Number(selectedInvoice.discountAmount || 0))}</span></div>
                  <div className="flex justify-between mb-2"><span className="text-gray-500">Service Charge</span><span>{formatLKR(Number(selectedInvoice.serviceChargeAmount || 0))}</span></div>
                  <div className="flex justify-between mb-2"><span className="text-gray-500">VAT</span><span>{formatLKR(selectedInvoice.tax)}</span></div>
                  <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold text-[#151515]"><span>Total</span><span>{formatLKR(selectedInvoice.total)}</span></div>
                </div>

                {selectedInvoice.status === 'paid' && (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-800">Payment Recorded</p>
                      <p className="text-sm text-emerald-600 capitalize">
                        {selectedInvoice.paymentMethod} on {selectedInvoice.paidAt ? format(selectedInvoice.paidAt, 'MMM d, yyyy h:mm a') : '-'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReceiptAction('print')}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button
                    onClick={() => handleReceiptAction('digital')}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </div>

                <div className="flex gap-2">
                  {selectedInvoice.status !== 'paid' && (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600"
                    >
                      <CheckCircle className="w-4 h-4" /> Mark as Paid
                    </button>
                  )}
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentModal && selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full"
            >
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-[#151515]">Record Payment</h3>
                <p className="text-gray-500">{selectedInvoice.id} | {formatLKR(selectedInvoice.total)}</p>
              </div>

              <div className="p-6 space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
                        selectedPaymentMethod === method.id
                          ? 'border-[#ff5a65] bg-[#ff5a65]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        selectedPaymentMethod === method.id ? 'bg-[#ff5a65]' : 'bg-gray-100'
                      )}>
                        <Icon className={cn('w-5 h-5', selectedPaymentMethod === method.id ? 'text-white' : 'text-gray-500')} />
                      </div>
                      <span className={cn('font-medium', selectedPaymentMethod === method.id ? 'text-[#ff5a65]' : 'text-gray-700')}>
                        {method.label}
                      </span>
                      {selectedPaymentMethod === method.id && <CheckCircle className="w-5 h-5 text-[#ff5a65] ml-auto" />}
                    </button>
                  );
                })}
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600">
                  Cancel
                </button>
                <button onClick={handleMarkAsPaid} className="px-4 py-2 bg-emerald-500 text-white rounded-xl">
                  Confirm Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
