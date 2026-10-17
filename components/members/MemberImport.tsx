'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SafeUser } from '@/lib/types';
import { importMembersAction } from '@/lib/actions/members';
import { mapMemberGrid, normalizeMemberWing, parseCsvGrid, type ImportedMember } from '@/lib/utils/member-import';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FileUp } from 'lucide-react';

type Resolution = 'import' | 'update' | 'skip';
type ImportRow = ImportedMember & { id: number; resolution: Resolution; result?: string };

interface MemberImportProps {
  members: SafeUser[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 250;

function getDocxGrid(html: string): string[][] {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const tableRows = Array.from(document.querySelectorAll('table tr')).map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent?.trim() || '')
  );
  if (tableRows.length) return tableRows.filter((row) => row.some(Boolean));

  return (document.body.textContent || '')
    .split(/\r?\n/)
    .map((line) => line.split('\t').map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

function getDifferences(row: ImportRow, member: SafeUser): string[] {
  const comparisons: Array<[string, string | null | undefined, string]> = [
    ['Name', member.full_name, row.fullName],
    ['Preferred name', member.preferred_name, row.preferredName],
    ['Phone', member.phone, row.phone],
    ['Wing', member.wing, row.wing],
    ['Ministry role', member.wing_role, row.wingRole],
    ['Birth date', member.birth_date, row.birthDate],
    ['Join date', member.join_date, row.joinDate],
    ['Address', member.address, row.address],
    ['Emergency contact', member.emergency_contact_name, row.emergencyContactName],
    ['Emergency phone', member.emergency_contact_phone, row.emergencyContactPhone],
    ['Officer notes', member.officer_notes, row.officerNotes],
  ];
  return comparisons
    .filter(([, current, imported]) => imported && current !== imported)
    .map(([label, current, imported]) => `${label}: ${current || 'blank'} → ${imported}`);
}

export function MemberImport({ members }: MemberImportProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState('');

  const existingByEmail = useMemo(
    () => new Map(members.flatMap((member) => member.email ? [[member.email.toLowerCase(), member] as const] : [])),
    [members]
  );
  const earlierRowsByEmail = useMemo(() => {
    const seen = new Map<string, number>();
    rows.forEach((row) => {
      const email = row.email.trim().toLowerCase();
      if (email && !seen.has(email)) seen.set(email, row.id);
    });
    return seen;
  }, [rows]);

  const close = () => {
    if (isSaving || isParsing) return;
    setIsOpen(false);
    setError('');
  };

  const handleFile = async (file?: File) => {
    setError('');
    setSummary('');
    setRows([]);
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv' && extension !== 'docx') {
      setError('Choose a .docx Word document or a .csv file.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('The file is too large. The maximum upload size is 5 MB.');
      return;
    }

    setIsParsing(true);
    setFileName(file.name);
    try {
      let grid: string[][];
      if (extension === 'csv') {
        grid = parseCsvGrid(await file.text());
      } else {
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
        grid = getDocxGrid(result.value);
      }

      const membersFromFile = mapMemberGrid(grid);
      if (!membersFromFile.length) {
        throw new Error('No member rows were found. Use a table with a header row such as Name; Email is optional.');
      }
      if (membersFromFile.length > MAX_ROWS) {
        throw new Error(`This file has ${membersFromFile.length} rows. Import up to ${MAX_ROWS} members at a time.`);
      }

      const seenEmails = new Set<string>();
      setRows(membersFromFile.map((member, id) => {
        const email = member.email.trim().toLowerCase();
        const isDuplicate = Boolean(email && (existingByEmail.has(email) || seenEmails.has(email)));
        if (email) seenEmails.add(email);
        return {
          ...member,
          id,
          resolution: isDuplicate ? 'skip' : 'import',
        };
      }));
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Unable to read this file.');
    } finally {
      setIsParsing(false);
    }
  };

  const updateRow = (id: number, updates: Partial<ImportRow>) => {
    setRows((current) => {
      const updated = current.map((row) => row.id === id ? { ...row, ...updates, result: undefined } : row);
      if (updates.email !== undefined) {
        const index = updated.findIndex((row) => row.id === id);
        const row = updated[index];
        const email = row.email.trim().toLowerCase();
        const duplicate = Boolean(email && (
          existingByEmail.has(email) ||
          updated.some((other) => other.id !== id && other.email.trim().toLowerCase() === email)
        ));
        if (duplicate && row.resolution === 'import') row.resolution = 'skip';
        if (!duplicate && row.resolution === 'update') row.resolution = 'import';
      }
      return updated;
    });
    setSummary('');
  };

  const handleImport = async () => {
    setError('');
    setSummary('');
    setIsSaving(true);
    try {
      const result = await importMembersAction(
        rows.map(({ id, result: _result, ...row }) => row)
      );
      if ('error' in result) {
        setError(result.error || 'The import could not be completed.');
        return;
      }

      setRows((current) => current.map((row, index) => ({
        ...row,
        result: result.rows[index]?.message || 'Skipped.',
      })));
      setSummary(`Import complete: ${result.created} added, ${result.updated} updated, ${result.skipped} skipped.`);
      router.refresh();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'The import could not be completed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)} className="w-full sm:w-auto">
        <FileUp className="w-4 h-4 mr-1.5" />
        Upload Member List
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title="Import Members"
        description="Upload a Word table or CSV, review the extracted records, and confirm before saving."
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
            Use a header row with names such as Name/Full Name, Email, Phone, Wing/Ministry, Voice Part, Birth Date/DOB,
            Join Date, Address, Emergency Contact Name/Phone, and Notes. Word documents should use a table.
            Name is required; email and other directory details are optional. Imported members without login details are saved as inactive directory records.
            You can add their email and set a password later from Edit Member; empty fields do not erase existing details when updating.
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-stone-700">Word document (.docx) or CSV (.csv)</span>
            <input
              type="file"
              accept=".docx,.csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv"
              disabled={isParsing || isSaving}
              onChange={(event) => handleFile(event.target.files?.[0])}
              className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-stone-700 hover:file:bg-stone-200"
            />
          </label>
          {isParsing && <p className="text-sm text-stone-500">Reading member list…</p>}
          {fileName && !isParsing && <p className="text-xs text-stone-500">File: {fileName}</p>}

          {rows.length > 0 && (
            <>
              <div className="flex flex-col gap-2 rounded-lg border border-stone-200 p-3 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-xs text-stone-600">
                  {rows.length} record{rows.length === 1 ? '' : 's'} found. Review duplicate choices and correct missing names or invalid emails.
                </p>
              </div>

              <div className="max-h-[45vh] overflow-auto rounded-lg border border-stone-200">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="sticky top-0 bg-stone-100 text-stone-700">
                    <tr>
                      <th className="p-2">Name *</th>
                      <th className="p-2">Email (optional)</th>
                      <th className="p-2">Phone</th>
                      <th className="p-2">Wing / Role</th>
                      <th className="p-2">Duplicate resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const email = row.email.trim().toLowerCase();
                      const existing = email ? existingByEmail.get(email) : undefined;
                      const earlierId = email ? earlierRowsByEmail.get(email) : undefined;
                      const earlier = earlierId !== undefined && earlierId !== row.id;
                      const duplicate = Boolean(existing || earlier);
                      const invalidEmail = Boolean(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
                      return (
                        <tr key={row.id} className="border-t border-stone-100 align-top">
                          <td className="p-2">
                            <input
                              aria-label={`Member ${row.id + 1} full name`}
                              value={row.fullName}
                              onChange={(event) => updateRow(row.id, { fullName: event.target.value })}
                              className="w-40 rounded border border-stone-300 px-2 py-1.5"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              aria-label={`Member ${row.id + 1} email`}
                              type="email"
                              value={row.email}
                              onChange={(event) => updateRow(row.id, { email: event.target.value })}
                              className="w-48 rounded border border-stone-300 px-2 py-1.5"
                            />
                            {!row.fullName.trim() && <span className="mt-1 block text-rose-700">Enter a member name or skip.</span>}
                            {invalidEmail && <span className="mt-1 block text-rose-700">Enter a valid email or clear the field.</span>}
                          </td>
                          <td className="p-2">{row.phone || '—'}</td>
                          <td className="p-2">
                            <select
                              aria-label={`Member ${row.id + 1} ministry wing`}
                              value={row.wing}
                              onChange={(event) => updateRow(row.id, { wing: event.target.value })}
                              className="max-w-40 rounded border border-stone-300 px-2 py-1.5"
                            >
                              <option value="">Use default wing</option>
                              {row.wing && !normalizeMemberWing(row.wing) && (
                                <option value={row.wing}>{row.wing} (not recognized)</option>
                              )}
                              <option value="Family of Praise">Family of Praise</option>
                              <option value="Asaphites">Asaphites</option>
                              <option value="Vimmies">Vimmies</option>
                              <option value="General Leadership">General Leadership</option>
                            </select>
                            <span className="mt-1 block">{row.wingRole || 'No ministry role'}</span>
                            {row.wing && !normalizeMemberWing(row.wing) && (
                              <span className="mt-1 block text-rose-700">Choose a supported wing or clear this value.</span>
                            )}
                            {[row.preferredName, row.birthDate, row.joinDate, row.address, row.emergencyContactName, row.emergencyContactPhone]
                              .filter(Boolean).length > 0 && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-choir-800">Other details</summary>
                                <span className="mt-1 block max-w-48 whitespace-normal text-stone-600">
                                  {[
                                    row.preferredName && `Preferred: ${row.preferredName}`,
                                    row.birthDate && `Birth date: ${row.birthDate}`,
                                    row.joinDate && `Join date: ${row.joinDate}`,
                                    row.address && `Address: ${row.address}`,
                                    row.emergencyContactName && `Emergency: ${row.emergencyContactName}`,
                                    row.emergencyContactPhone && `Emergency phone: ${row.emergencyContactPhone}`,
                                  ].filter(Boolean).join(' • ')}
                                </span>
                              </details>
                            )}
                          </td>
                          <td className="p-2">
                            <select
                              aria-label={`Member ${row.id + 1} import choice`}
                              value={duplicate && row.resolution === 'import' ? 'skip' : row.resolution}
                              onChange={(event) => updateRow(row.id, { resolution: event.target.value as Resolution })}
                              className="rounded border border-stone-300 px-2 py-1.5"
                            >
                              <option value={duplicate ? 'skip' : 'import'}>{duplicate ? 'Skip this row' : 'Add as new member'}</option>
                              {duplicate && <option value="update">Update matched member</option>}
                              {!duplicate && <option value="skip">Skip row</option>}
                            </select>
                            {duplicate && existing && (
                              <>
                                <span className="mt-1 block text-amber-800">
                                  Matches {existing.full_name}. Updating changes only non-empty uploaded fields.
                                </span>
                                {getDifferences(row, existing).map((difference) => (
                                  <span key={difference} className="mt-1 block max-w-64 whitespace-normal text-stone-600">
                                    {difference}
                                  </span>
                                ))}
                              </>
                            )}
                            {duplicate && earlier && !existing && (
                              <span className="mt-1 block text-amber-800">Same email as an earlier upload row.</span>
                            )}
                            {row.result && <span className="mt-1 block text-emerald-800">{row.result}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
          {summary && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{summary}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close} disabled={isSaving || isParsing}>
              Close
            </Button>
            {rows.length > 0 && (
              <Button type="button" onClick={handleImport} disabled={isSaving || isParsing} isLoading={isSaving} loadingText="Saving members…">
                Confirm Import
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
