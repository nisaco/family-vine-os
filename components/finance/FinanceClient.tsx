'use client';

import React, { useState } from 'react';
import { useFormState } from 'react-dom';
import {
  FinancialTransaction,
  FinancialCategory,
  SafeUser,
  UserRole,
  PaymentMethod,
} from '@/lib/types';
import {
  createIncomeTransactionAction,
  createExpenseTransactionAction,
  voidOrReverseTransactionAction,
  reviewTransactionAction,
} from '@/lib/actions/finance';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateOnly } from '@/lib/utils/timezone';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Download,
  Receipt,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';

interface FinanceClientProps {
  transactions: FinancialTransaction[];
  categories: FinancialCategory[];
  members: SafeUser[];
  currencySymbol: string;
  currencyCode: string;
  timezone: string;
  currentUserRole: UserRole;
  currentUserId: string;
  summary: {
    totalIncomeCents: number;
    totalExpenseCents: number;
    netBalanceCents: number;
    categoryBreakdown: Array<{ name: string; type: string; total_cents: number }>;
  };
}

export function FinanceClient({
  transactions,
  categories,
  members,
  currencySymbol,
  currencyCode,
  timezone,
  currentUserRole,
  currentUserId,
  summary,
}: FinanceClientProps) {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isIncomeOpen, setIsIncomeOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState<FinancialTransaction | null>(null);

  // Voiding state
  const [voidingTx, setVoidingTx] = useState<FinancialTransaction | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  const [incomeState, incomeAction] = useFormState(createIncomeTransactionAction, null);
  const [expenseState, expenseAction] = useFormState(createExpenseTransactionAction, null);

  const canCreateIncome =
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'FINANCIAL_SECRETARY' ||
    currentUserRole === 'TREASURER';

  const canCreateExpense =
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'TREASURER';

  const canReverse =
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'TREASURER' ||
    currentUserRole === 'FINANCIAL_SECRETARY';

  const canReview =
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'TREASURER' ||
    currentUserRole === 'FINANCIAL_SECRETARY';

  const incomeCategories = categories.filter((c) => c.type === 'INCOME');
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  const filtered = transactions.filter((t) => {
    if (filterType !== 'ALL' && t.transaction_type !== filterType) return false;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      t.description.toLowerCase().includes(term) ||
      t.payee_or_source.toLowerCase().includes(term) ||
      (t.receipt_number && t.receipt_number.toLowerCase().includes(term)) ||
      (t.member_name && t.member_name.toLowerCase().includes(term));
    return matchesSearch;
  });

  const handleOpenVoid = (tx: FinancialTransaction) => {
    setVoidingTx(tx);
    setVoidReason('');
    setIsVoiding(true);
  };

  const handleConfirmVoid = async () => {
    if (!voidingTx || !voidReason.trim()) return;
    await voidOrReverseTransactionAction(voidingTx.id, voidReason.trim());
    setIsVoiding(false);
    setVoidingTx(null);
  };

  const handleReview = async (txId: string) => {
    const res = await reviewTransactionAction(txId);
    if (res?.error) {
      alert(res.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
            Financial Ledger & Accounts
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Audit-backed bookkeeping for dues, disbursements, and receipts
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href="/api/finance/export"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Export CSV</span>
          </a>

          {canCreateIncome && (
            <Button size="sm" onClick={() => setIsIncomeOpen(true)}>
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Record Income / Dues
            </Button>
          )}

          {canCreateExpense && (
            <Button size="sm" variant="outline" onClick={() => setIsExpenseOpen(true)}>
              <TrendingDown className="w-4 h-4 mr-1.5 text-rose-700" />
              Record Expense
            </Button>
          )}
        </div>
      </div>

      {/* Financial Health Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            <span>Total Income (Posted)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {formatCurrency(summary.totalIncomeCents, currencySymbol, currencyCode)}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Dues & collections</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            <span>Total Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">
            {formatCurrency(summary.totalExpenseCents, currencySymbol, currencyCode)}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Disbursements</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            <span>Net Operating Balance</span>
            <DollarSign className="w-4 h-4 text-stone-700" />
          </div>
          <div className={`text-2xl font-bold ${summary.netBalanceCents >= 0 ? 'text-stone-900' : 'text-rose-700'}`}>
            {formatCurrency(summary.netBalanceCents, currencySymbol, currencyCode)}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Current treasury balance</p>
        </div>
      </div>

      {/* Category Breakdown Progress */}
      {summary.categoryBreakdown.length > 0 && (
        <Card title="Category Summary">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {summary.categoryBreakdown.slice(0, 8).map((cat, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-stone-50 border border-stone-200/70 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-stone-900 block truncate max-w-[130px]">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-stone-500 uppercase font-semibold">
                    {cat.type}
                  </span>
                </div>
                <span className="font-bold text-stone-800">
                  {formatCurrency(cat.total_cents, currencySymbol, currencyCode)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by description, receipt number, or person..."
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              filterType === 'ALL'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Entries
          </button>
          <button
            type="button"
            onClick={() => setFilterType('INCOME')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              filterType === 'INCOME'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Income / Dues
          </button>
          <button
            type="button"
            onClick={() => setFilterType('EXPENSE')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              filterType === 'EXPENSE'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Expenses
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <Card title="Ledger Transactions">
        {filtered.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {filtered.map((tx) => {
              const isIncome = tx.transaction_type === 'INCOME';
              const isVoided = tx.status === 'VOIDED';

              return (
                <div
                  key={tx.id}
                  className={`py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isVoided ? 'opacity-50 line-through' : ''
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        size="sm"
                        variant={
                          isVoided
                            ? 'danger'
                            : isIncome
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {isVoided ? 'VOIDED' : tx.transaction_type}
                      </Badge>

                      {tx.receipt_number && (
                        <span className="font-mono text-xs text-choir-900 font-semibold bg-choir-50 px-2 py-0.5 rounded border border-choir-200">
                          {tx.receipt_number}
                        </span>
                      )}

                      <span className="text-xs text-stone-500 font-medium">
                        {tx.category_name}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-stone-900">
                      {tx.description}
                    </h4>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-500">
                      <span>Date: {formatDateOnly(tx.date, timezone)}</span>
                      <span>•</span>
                      <span>Party: {tx.payee_or_source}</span>
                      <span>•</span>
                      <span>Method: {tx.payment_method.replace('_', ' ')}</span>
                      {tx.reviewed_by_name && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verified by {tx.reviewed_by_name}
                          </span>
                        </>
                      )}
                    </div>

                    {isVoided && tx.reversal_reason && (
                      <p className="text-xs text-rose-800 font-medium italic mt-1">
                        Void reason: {tx.reversal_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <span
                      className={`text-base font-bold ${
                        isIncome ? 'text-emerald-700' : 'text-stone-900'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(tx.amount_cents, currencySymbol, currencyCode)}
                    </span>

                    <div className="flex items-center gap-2 text-xs">
                      {canReview && !tx.reviewed_by && !isVoided && (
                        <button
                          type="button"
                          onClick={() => handleReview(tx.id)}
                          className="text-stone-600 hover:text-stone-900 font-medium hover:underline text-[11px]"
                        >
                          Verify Entry
                        </button>
                      )}

                      {canReverse && !isVoided && (
                        <button
                          type="button"
                          onClick={() => handleOpenVoid(tx)}
                          className="text-rose-600 hover:text-rose-800 font-medium hover:underline text-[11px]"
                        >
                          Void / Reversal
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-stone-400 text-xs">
            No transactions match the selected filters.
          </div>
        )}
      </Card>

      {/* Record Income Modal */}
      <Modal
        isOpen={isIncomeOpen}
        onClose={() => setIsIncomeOpen(false)}
        title="Record Income / Member Dues"
        description="Generates an official verifiable receipt number automatically."
      >
        <form
          action={async (formData) => {
            await incomeAction(formData);
            setIsIncomeOpen(false);
          }}
          className="space-y-4"
        >
          {incomeState?.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
              {incomeState.error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              name="amount"
              type="text"
              required
              placeholder="e.g. 25.00"
              helperText={`In ${currencyCode} (${currencySymbol})`}
            />

            <Input
              label="Date"
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Income Category *
            </label>
            <select
              name="categoryId"
              required
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
            >
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Link Member (For Dues)
              </label>
              <select
                name="memberId"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
              >
                <option value="">Non-member / General Patron</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.voice_part || 'General'})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Dues Period (Optional)"
              name="duesPeriod"
              placeholder="e.g. 2026-10 or 2026 Annual"
            />
          </div>

          <Input
            label="Received From / Source *"
            name="payeeOrSource"
            required
            placeholder="Payer name or source of funds"
          />

          <Input
            label="Description *"
            name="description"
            required
            placeholder="e.g. October monthly dues payment"
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Payment Method
            </label>
            <select
              name="paymentMethod"
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="CHECK">Check</option>
              <option value="CARD">Card / Online</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <Input
            label="Internal Reference / Note"
            name="referenceNote"
            placeholder="Bank transaction ID or memo"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsIncomeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Issue Receipt & Save</Button>
          </div>
        </form>
      </Modal>

      {/* Record Expense Modal */}
      <Modal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        title="Record Expense Disbursement"
        description="Records an expenditure out of choir funds."
      >
        <form
          action={async (formData) => {
            await expenseAction(formData);
            setIsExpenseOpen(false);
          }}
          className="space-y-4"
        >
          {expenseState?.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
              {expenseState.error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              name="amount"
              type="text"
              required
              placeholder="e.g. 45.00"
              helperText={`In ${currencyCode} (${currencySymbol})`}
            />

            <Input
              label="Date"
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Expense Category *
            </label>
            <select
              name="categoryId"
              required
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Payee / Vendor *"
            name="payeeOrSource"
            required
            placeholder="e.g. Oxford Choral Music or Sister Grace (Reimbursement)"
          />

          <Input
            label="Description *"
            name="description"
            required
            placeholder="e.g. 40 vocal scores for Easter Cantata"
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Disbursement Method
            </label>
            <select
              name="paymentMethod"
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="CHECK">Check</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <Input
            label="Invoice / Bill Reference"
            name="referenceNote"
            placeholder="Invoice # or voucher note"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsExpenseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Disbursement</Button>
          </div>
        </form>
      </Modal>

      {/* Mandatory Reason Void Modal */}
      {voidingTx && (
        <Modal
          isOpen={isVoiding}
          onClose={() => setIsVoiding(false)}
          title="Void / Reverse Financial Entry"
          description="In compliance with financial integrity, posted records are never silently erased. A reversal note is permanently logged."
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
              <span className="font-semibold text-rose-900 block">Transaction to Void:</span>
              <p className="text-rose-800">
                {voidingTx.description} —{' '}
                {formatCurrency(voidingTx.amount_cents, currencySymbol, currencyCode)}
                {voidingTx.receipt_number ? ` (${voidingTx.receipt_number})` : ''}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Mandatory Explanation for Reversal *
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                required
                placeholder="State reason (e.g. Duplicate entry recorded by mistake, check bounced, wrong member credited)..."
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-700"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsVoiding(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmVoid}
                disabled={!voidReason.trim() || voidReason.trim().length < 5}
              >
                Confirm Void & Log Audit
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

