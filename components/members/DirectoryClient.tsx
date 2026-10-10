'use client';

import React, { useState } from 'react';
import { useFormState } from 'react-dom';
import { SafeUser, UserRole, VoicePart, UserStatus } from '@/lib/types';
import { createMemberAction, updateMemberAction, toggleMemberStatusAction } from '@/lib/actions/members';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Search,
  UserPlus,
  Phone,
  Mail,
  Shield,
  Eye,
  Edit2,
  UserX,
  UserCheck,
  MapPin,
  HeartHandshake,
  FileText,
} from 'lucide-react';

interface DirectoryClientProps {
  members: SafeUser[];
  currentUserId: string;
  currentUserRole: UserRole;
}

export function DirectoryClient({
  members,
  currentUserId,
  currentUserRole,
}: DirectoryClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [voiceFilter, setVoiceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [selectedMember, setSelectedMember] = useState<SafeUser | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [createState, createAction] = useFormState(createMemberAction, null);
  const [editState, editAction] = useFormState(updateMemberAction, null);

  const canManageMembers =
    currentUserRole === 'ADMIN' || currentUserRole === 'GENERAL_SECRETARY';
  const isAdmin = currentUserRole === 'ADMIN';

  const filtered = members.filter((m) => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.phone && m.phone.includes(searchTerm));

    const matchesVoice =
      voiceFilter === 'ALL' || m.voice_part === voiceFilter;

    const matchesStatus =
      statusFilter === 'ALL' || m.status === statusFilter;

    return matchesSearch && matchesVoice && matchesStatus;
  });

  const handleOpenDetail = (member: SafeUser) => {
    setSelectedMember(member);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (member: SafeUser) => {
    setSelectedMember(member);
    setIsEditOpen(true);
  };

  const handleToggleStatus = async (memberId: string, currentStatus: UserStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const message =
      nextStatus === 'INACTIVE'
        ? 'Are you sure you want to deactivate this member? They will not be able to log in.'
        : 'Are you sure you want to restore access for this member?';
    if (confirm(message)) {
      await toggleMemberStatusAction(memberId, nextStatus);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
            Member Directory
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Registered choristers, accompanists, and leadership team
          </p>
        </div>

        {canManageMembers && (
          <Button onClick={() => setIsCreateOpen(true)} className="flex-shrink-0">
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add Member
          </Button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or telephone..."
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <select
            value={voiceFilter}
            onChange={(e) => setVoiceFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 text-stone-700"
          >
            <option value="ALL">All Voice Parts</option>
            <option value="Soprano">Soprano</option>
            <option value="Alto">Alto</option>
            <option value="Tenor">Tenor</option>
            <option value="Bass">Bass</option>
            <option value="Musician">Musician / Organist</option>
            <option value="Director">Music Director</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 text-stone-700"
          >
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Deactivated</option>
            <option value="ALL">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Directory Grid / Responsive View */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <div
              key={member.id}
              className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                member.status === 'INACTIVE'
                  ? 'border-stone-200 opacity-60 bg-stone-50/50'
                  : 'border-stone-200/90 hover:border-choir-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-base text-stone-900 leading-tight">
                      {member.full_name}
                    </h3>
                    {member.preferred_name && member.preferred_name !== member.full_name && (
                      <span className="text-xs text-stone-500">
                        &ldquo;{member.preferred_name}&rdquo;
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={
                        member.role === 'ADMIN'
                          ? 'purple'
                          : member.role === 'PRESIDENT'
                          ? 'gold'
                          : member.role === 'MEMBER'
                          ? 'default'
                          : 'info'
                      }
                      size="sm"
                    >
                      {member.role.replace('_', ' ')}
                    </Badge>
                    {member.status === 'INACTIVE' && (
                      <Badge variant="danger" size="sm">
                        Deactivated
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-stone-600">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-800">Voice Part:</span>
                    <span>{member.voice_part || 'General'}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenDetail(member)}
                  className="text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View Details
                </Button>

                <div className="flex items-center gap-1">
                  {canManageMembers && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(member)}
                      className="p-1.5 text-stone-600 hover:text-stone-900"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {isAdmin && member.id !== currentUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleStatus(member.id, member.status)}
                      className={`p-1.5 ${
                        member.status === 'ACTIVE'
                          ? 'text-rose-600 hover:text-rose-800'
                          : 'text-emerald-600 hover:text-emerald-800'
                      }`}
                      title={member.status === 'ACTIVE' ? 'Deactivate member' : 'Restore access'}
                    >
                      {member.status === 'ACTIVE' ? (
                        <UserX className="w-3.5 h-3.5" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200 text-stone-500">
          <p className="text-sm font-medium">No members found matching your filter criteria.</p>
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedMember.full_name}
          description={`${selectedMember.role.replace('_', ' ')} • ${selectedMember.voice_part || 'General'}`}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold block">
                  Status
                </span>
                <span className="font-medium text-stone-900">
                  {selectedMember.status}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold block">
                  Join Date
                </span>
                <span className="font-medium text-stone-900">
                  {selectedMember.join_date || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold block">
                  Email
                </span>
                <span className="font-medium text-stone-900 truncate block">
                  {selectedMember.email}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold block">
                  Telephone
                </span>
                <span className="font-medium text-stone-900">
                  {selectedMember.phone || 'Not provided'}
                </span>
              </div>
            </div>

            {/* Restricted / Sensitive Details (only present if authorized) */}
            {(selectedMember.address || selectedMember.emergency_contact_name) && (
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Confidential Officer / Contact Info</span>
                </div>
                {selectedMember.address && (
                  <div className="text-xs text-stone-700">
                    <span className="font-medium text-stone-900">Address: </span>
                    {selectedMember.address}
                  </div>
                )}
                {selectedMember.emergency_contact_name && (
                  <div className="text-xs text-stone-700">
                    <span className="font-medium text-stone-900">Emergency Contact: </span>
                    {selectedMember.emergency_contact_name} ({selectedMember.emergency_contact_phone || 'No phone'})
                  </div>
                )}
              </div>
            )}

            {/* Officer Notes (Strictly hidden from ordinary members) */}
            {selectedMember.officer_notes && (
              <div className="p-3.5 bg-stone-100 rounded-xl border border-stone-200 space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-600 block">
                  Confidential Leadership Notes
                </span>
                <p className="text-xs text-stone-800 leading-relaxed">
                  {selectedMember.officer_notes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Member Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Choir Member"
        description="Register a new chorister into the choir system."
      >
        <form
          action={async (formData) => {
            await createAction(formData);
            setIsCreateOpen(false);
          }}
          className="space-y-4"
        >
          {createState?.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
              {createState.error}
            </div>
          )}

          <Input label="Full Name" name="fullName" required placeholder="e.g. John Doe" />
          <Input label="Email Address" name="email" type="email" required placeholder="chorister@familyvinechoir.org" />
          <Input label="Phone Number" name="phone" placeholder="+1 (555) 000-0000" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Voice Part
              </label>
              <select
                name="voicePart"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
              >
                <option value="Soprano">Soprano</option>
                <option value="Alto">Alto</option>
                <option value="Tenor">Tenor</option>
                <option value="Bass">Bass</option>
                <option value="Musician">Musician</option>
                <option value="Director">Music Director</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Choir Role
              </label>
              <select
                name="role"
                defaultValue="MEMBER"
                disabled={!isAdmin}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 disabled:bg-stone-100"
              >
                <option value="MEMBER">Member</option>
                {isAdmin && (
                  <>
                    <option value="PRESIDENT">President</option>
                    <option value="GENERAL_SECRETARY">General Secretary</option>
                    <option value="FINANCIAL_SECRETARY">Financial Secretary</option>
                    <option value="TREASURER">Treasurer</option>
                    <option value="ADMIN">Administrator</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <Input
            label="Temporary Initial Password"
            name="temporaryPassword"
            defaultValue="Choir2026!"
            helperText="Member will use this to sign in and can change it on their profile."
          />

          <Input label="Home Address (Optional)" name="address" placeholder="Physical street address" />
          
          <div className="grid grid-cols-2 gap-3">
            <Input label="Emergency Contact Name" name="emergencyContactName" placeholder="Next of kin" />
            <Input label="Emergency Contact Phone" name="emergencyContactPhone" placeholder="Emergency telephone" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Officer Notes (Confidential)
            </label>
            <textarea
              name="officerNotes"
              rows={2}
              placeholder="Private notes visible only to executive leadership..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Member</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      {selectedMember && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Member: ${selectedMember.full_name}`}
        >
          <form
            action={async (formData) => {
              formData.append('memberId', selectedMember.id);
              await editAction(formData);
              setIsEditOpen(false);
            }}
            className="space-y-4"
          >
            {editState?.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {editState.error}
              </div>
            )}

            <Input label="Full Name" name="fullName" defaultValue={selectedMember.full_name} required />
            <Input label="Email Address" name="email" type="email" defaultValue={selectedMember.email} required />
            <Input label="Phone" name="phone" defaultValue={selectedMember.phone || ''} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Voice Part
                </label>
                <select
                  name="voicePart"
                  defaultValue={selectedMember.voice_part || 'General'}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
                >
                  <option value="Soprano">Soprano</option>
                  <option value="Alto">Alto</option>
                  <option value="Tenor">Tenor</option>
                  <option value="Bass">Bass</option>
                  <option value="Musician">Musician</option>
                  <option value="Director">Music Director</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Choir Role
                </label>
                <select
                  name="role"
                  defaultValue={selectedMember.role}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 disabled:bg-stone-100"
                >
                  <option value="MEMBER">Member</option>
                  {isAdmin && (
                    <>
                      <option value="PRESIDENT">President</option>
                      <option value="GENERAL_SECRETARY">General Secretary</option>
                      <option value="FINANCIAL_SECRETARY">Financial Secretary</option>
                      <option value="TREASURER">Treasurer</option>
                      <option value="ADMIN">Administrator</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <Input label="Address" name="address" defaultValue={selectedMember.address || ''} />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Emergency Contact Name"
                name="emergencyContactName"
                defaultValue={selectedMember.emergency_contact_name || ''}
              />
              <Input
                label="Emergency Contact Phone"
                name="emergencyContactPhone"
                defaultValue={selectedMember.emergency_contact_phone || ''}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Officer Notes
              </label>
              <textarea
                name="officerNotes"
                defaultValue={selectedMember.officer_notes || ''}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
