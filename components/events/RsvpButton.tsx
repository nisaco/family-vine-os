'use client';

import React, { useState } from 'react';
import { useFormState } from 'react-dom';
import { submitRsvpAction } from '@/lib/actions/events';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { RsvpStatus } from '@/lib/types';
import { Check, X, HelpCircle } from 'lucide-react';

interface RsvpButtonProps {
  eventId: string;
  eventTitle: string;
  currentStatus?: RsvpStatus;
  currentReason?: string | null;
}

export function RsvpButton({
  eventId,
  eventTitle,
  currentStatus,
  currentReason,
}: RsvpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RsvpStatus>(
    currentStatus || 'ATTENDING'
  );
  const [reason, setReason] = useState(currentReason || '');
  const [state, formAction] = useFormState(submitRsvpAction, null);

  const handleSubmit = async (formData: FormData) => {
    formData.append('eventId', eventId);
    formData.append('status', selectedStatus);
    formData.append('apologyReason', reason);
    formAction(formData);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant={currentStatus ? 'outline' : 'primary'}
        onClick={() => setIsOpen(true)}
      >
        {currentStatus ? 'Change My RSVP' : 'Submit RSVP'}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`RSVP: ${eventTitle}`}
        description="Let the choir director and section leaders know if you will be present."
      >
        <form action={handleSubmit} className="space-y-5">
          {state?.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
              {state.error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
              Your Response
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedStatus('ATTENDING')}
                className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  selectedStatus === 'ATTENDING'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold ring-2 ring-emerald-600'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <Check className="w-5 h-5 text-emerald-600" />
                <span className="text-xs">Attending</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('NOT_ATTENDING')}
                className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  selectedStatus === 'NOT_ATTENDING'
                    ? 'border-rose-600 bg-rose-50 text-rose-950 font-semibold ring-2 ring-rose-600'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <X className="w-5 h-5 text-rose-600" />
                <span className="text-xs">Cannot Attend</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('MAYBE')}
                className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  selectedStatus === 'MAYBE'
                    ? 'border-amber-600 bg-amber-50 text-amber-950 font-semibold ring-2 ring-amber-600'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <span className="text-xs">Tentative</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              {selectedStatus === 'NOT_ATTENDING'
                ? 'Absence Apology / Reason'
                : 'Optional Note to Director'}
            </label>
            <textarea
              name="apologyReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={
                selectedStatus === 'NOT_ATTENDING'
                  ? 'Please state reason (e.g. Work travel, medical emergency, exams)...'
                  : 'Any note regarding timing or transport...'
              }
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 placeholder-stone-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Confirm RSVP</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

