'use client';

import React, { useState } from 'react';
import { FinancialTransaction } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateOnly } from '@/lib/utils/timezone';
import { Receipt, Printer, CheckCircle, Clock } from 'lucide-react';

interface MyFinancesClientProps {
  payments: FinancialTransaction[];
  totalPaidCents: number;
  currencySymbol: string;
  currencyCode: string;
  timezone: string;
  userName: string;
  choirName: string;
}

export function MyFinancesClient({
  payments,
  totalPaidCents,
  currencySymbol,
  currencyCode,
  timezone,
  userName,
  choirName,
}: MyFinancesClientProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<FinancialTransaction | null>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
          My Dues & Payment Receipts
        </h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Official payment record and verified receipts for {userName}
        </p>
      </div>

      {/* Summary Stat */}
      <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs max-w-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-1">
          Total Contributed This Season
        </span>
        <div className="text-3xl font-bold text-stone-900">
          {formatCurrency(totalPaidCents, currencySymbol, currencyCode)}
        </div>
        <p className="text-xs text-stone-400 mt-1">
          {payments.length} verified transaction{payments.length === 1 ? '' : 's'} on record
        </p>
      </div>

      {/* Receipts Table */}
      <Card title="Payment History">
        {payments.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {payments.map((tx) => (
              <div
                key={tx.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {tx.receipt_number && (
                      <span className="font-mono text-xs font-bold text-choir-900 bg-choir-50 px-2 py-0.5 rounded border border-choir-200">
                        {tx.receipt_number}
                      </span>
                    )}
                    <span className="text-xs text-stone-500 font-medium">
                      {tx.category_name}
                    </span>
                    {tx.dues_period && (
                      <Badge variant="gold" size="sm">
                        {tx.dues_period}
                      </Badge>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-stone-900">
                    {tx.description}
                  </h4>

                  <div className="flex items-center gap-3 text-xs text-stone-500">
                    <span>Date: {formatDateOnly(tx.date, timezone)}</span>
                    <span>•</span>
                    <span>Method: {tx.payment_method.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                  <span className="text-base font-bold text-emerald-700">
                    {formatCurrency(tx.amount_cents, currencySymbol, currencyCode)}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(tx)}
                    className="inline-flex items-center gap-1 text-xs text-choir-800 hover:text-choir-950 font-medium hover:underline"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    View Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-stone-400 text-xs">
            No payments or dues on record yet. Contact your Financial Secretary if you recently made a payment.
          </div>
        )}
      </Card>

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReceipt(null)}
          title="Official Choir Receipt"
        >
          <div className="space-y-5 text-sm p-2">
            <div className="text-center pb-4 border-b border-stone-200">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                {choirName}
              </h3>
              <p className="text-xs text-stone-500">Official Payment Receipt</p>
              <div className="mt-2 inline-block font-mono text-xs font-bold bg-stone-100 text-stone-900 px-2.5 py-1 rounded border border-stone-200">
                {selectedReceipt.receipt_number || 'N/A'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-500 block">Received From:</span>
                <span className="font-semibold text-stone-900">{userName}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Date of Payment:</span>
                <span className="font-semibold text-stone-900">
                  {formatDateOnly(selectedReceipt.date, timezone)}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block">Purpose / Category:</span>
                <span className="font-semibold text-stone-900">
                  {selectedReceipt.category_name}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block">Payment Method:</span>
                <span className="font-semibold text-stone-900">
                  {selectedReceipt.payment_method.replace('_', ' ')}
                </span>
              </div>
              {selectedReceipt.dues_period && (
                <div>
                  <span className="text-stone-500 block">Dues Period:</span>
                  <span className="font-semibold text-stone-900">
                    {selectedReceipt.dues_period}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center">
              <span className="text-xs text-stone-500 uppercase font-semibold block">
                Amount Paid
              </span>
              <span className="text-2xl font-bold text-stone-900 block mt-1">
                {formatCurrency(selectedReceipt.amount_cents, currencySymbol, currencyCode)}
              </span>
              <p className="text-xs text-stone-600 mt-1 italic">
                {selectedReceipt.description}
              </p>
            </div>

            <div className="text-[11px] text-stone-400 text-center">
              Recorded in official choir ledger by {selectedReceipt.created_by_name || 'Choir Administration'}.
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
              <Button size="sm" onClick={() => setSelectedReceipt(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

