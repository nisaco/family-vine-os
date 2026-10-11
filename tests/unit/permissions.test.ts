import { describe, it, expect } from 'vitest';
import { hasPermission, sanitizeUser } from '@/lib/auth';
import type { User } from '@/lib/types';

describe('Role-Based Permissions Matrix', () => {
  it('enforces Admin capabilities', () => {
    expect(hasPermission('ADMIN', 'MANAGE_SETTINGS')).toBe(true);
    expect(hasPermission('ADMIN', 'MANAGE_USERS')).toBe(true);
    expect(hasPermission('ADMIN', 'VIEW_AUDIT_LOG')).toBe(true);
    expect(hasPermission('ADMIN', 'VIEW_ALL_FINANCE')).toBe(true);
    expect(hasPermission('ADMIN', 'CREATE_FINANCE_INCOME')).toBe(true);
    expect(hasPermission('ADMIN', 'CREATE_FINANCE_EXPENSE')).toBe(true);
  });

  it('restricts President from unauthorized direct raw financial creation or user role mutation', () => {
    expect(hasPermission('PRESIDENT', 'MANAGE_USERS')).toBe(false);
    expect(hasPermission('PRESIDENT', 'MANAGE_SETTINGS')).toBe(false);
    expect(hasPermission('PRESIDENT', 'VIEW_AUDIT_LOG')).toBe(false);
    expect(hasPermission('PRESIDENT', 'VIEW_ALL_FINANCE')).toBe(true);
    expect(hasPermission('PRESIDENT', 'CREATE_FINANCE_EXPENSE')).toBe(false);
    expect(hasPermission('PRESIDENT', 'CREATE_FINANCE_INCOME')).toBe(false);
    expect(hasPermission('PRESIDENT', 'MANAGE_EVENTS')).toBe(true);
    expect(hasPermission('PRESIDENT', 'MANAGE_ANNOUNCEMENTS')).toBe(true);
  });

  it('permits Financial Secretary to record income/dues but not expenses', () => {
    expect(hasPermission('FINANCIAL_SECRETARY', 'CREATE_FINANCE_INCOME')).toBe(true);
    expect(hasPermission('FINANCIAL_SECRETARY', 'CREATE_FINANCE_EXPENSE')).toBe(false);
    expect(hasPermission('FINANCIAL_SECRETARY', 'VIEW_ALL_FINANCE')).toBe(true);
    expect(hasPermission('FINANCIAL_SECRETARY', 'MANAGE_USERS')).toBe(false);
  });

  it('permits Treasurer to record expenses and review finances', () => {
    expect(hasPermission('TREASURER', 'CREATE_FINANCE_EXPENSE')).toBe(true);
    expect(hasPermission('TREASURER', 'VIEW_ALL_FINANCE')).toBe(true);
    expect(hasPermission('TREASURER', 'REVERSE_FINANCE')).toBe(true);
    expect(hasPermission('TREASURER', 'MANAGE_SETTINGS')).toBe(false);
  });

  it('restricts General Secretary to member directory, attendance, minutes, and events', () => {
    expect(hasPermission('GENERAL_SECRETARY', 'TAKE_ATTENDANCE')).toBe(true);
    expect(hasPermission('GENERAL_SECRETARY', 'MANAGE_MINUTES')).toBe(true);
    expect(hasPermission('GENERAL_SECRETARY', 'MANAGE_EVENTS')).toBe(true);
    expect(hasPermission('GENERAL_SECRETARY', 'VIEW_ALL_FINANCE')).toBe(false);
    expect(hasPermission('GENERAL_SECRETARY', 'CREATE_FINANCE_INCOME')).toBe(false);
    expect(hasPermission('GENERAL_SECRETARY', 'CREATE_FINANCE_EXPENSE')).toBe(false);
  });

  it('permits Welfare Officer to manage events and announcements, but restricts financial mutations and user administration', () => {
    expect(hasPermission('WELFARE_OFFICER', 'MANAGE_EVENTS')).toBe(true);
    expect(hasPermission('WELFARE_OFFICER', 'MANAGE_ANNOUNCEMENTS')).toBe(true);
    expect(hasPermission('WELFARE_OFFICER', 'VIEW_ALL_FINANCE')).toBe(false);
    expect(hasPermission('WELFARE_OFFICER', 'CREATE_FINANCE_INCOME')).toBe(false);
    expect(hasPermission('WELFARE_OFFICER', 'CREATE_FINANCE_EXPENSE')).toBe(false);
    expect(hasPermission('WELFARE_OFFICER', 'MANAGE_USERS')).toBe(false);
    expect(hasPermission('WELFARE_OFFICER', 'MANAGE_SETTINGS')).toBe(false);
  });

  it('strictly restricts regular Members from leadership actions', () => {
    expect(hasPermission('MEMBER', 'VIEW_ALL_FINANCE')).toBe(false);
    expect(hasPermission('MEMBER', 'CREATE_FINANCE_INCOME')).toBe(false);
    expect(hasPermission('MEMBER', 'CREATE_FINANCE_EXPENSE')).toBe(false);
    expect(hasPermission('MEMBER', 'TAKE_ATTENDANCE')).toBe(false);
    expect(hasPermission('MEMBER', 'MANAGE_EVENTS')).toBe(false);
    expect(hasPermission('MEMBER', 'MANAGE_ANNOUNCEMENTS')).toBe(false);
    expect(hasPermission('MEMBER', 'MANAGE_MINUTES')).toBe(false);
    expect(hasPermission('MEMBER', 'VIEW_CONFIDENTIAL_MINUTES')).toBe(false);
    expect(hasPermission('MEMBER', 'MANAGE_SETTINGS')).toBe(false);
    expect(hasPermission('MEMBER', 'VIEW_AUDIT_LOG')).toBe(false);
  });
});

describe('Member Privacy Boundary and Field Sanitization', () => {
  const sampleUser: User = {
    id: 'usr_test_1',
    email: 'member1@familyvinechoir.org',
    password_hash: 'secret_hash',
    full_name: 'Jane Doe',
    preferred_name: 'Jane',
    phone: '+1 555-9999',
    wing: 'Family of Praise',
    wing_role: 'Alto Chorister',
    voice_part: 'Alto',
    role: 'MEMBER',
    status: 'ACTIVE',
    address: 'Private Home Address 123',
    emergency_contact_name: 'Secret Relative',
    emergency_contact_phone: '+1 555-0000',
    officer_notes: 'Officer observation: Needs additional coaching on pitch',
    birth_date: '1995-04-12',
    join_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('masks private address, emergency contact, and officer notes when another member views', () => {
    const sanitized = sanitizeUser(sampleUser, 'MEMBER', false);
    expect((sanitized as Record<string, unknown>).password_hash).toBeUndefined();
    expect(sanitized.address).toBeUndefined();
    expect(sanitized.emergency_contact_name).toBeUndefined();
    expect(sanitized.emergency_contact_phone).toBeUndefined();
    expect(sanitized.officer_notes).toBeUndefined();
    expect(sanitized.full_name).toBe('Jane Doe');
    expect(sanitized.voice_part).toBe('Alto');
  });

  it('allows a member to view their own private address and emergency contact, but NEVER officer notes', () => {
    const sanitized = sanitizeUser(sampleUser, 'MEMBER', true);
    expect((sanitized as Record<string, unknown>).password_hash).toBeUndefined();
    expect(sanitized.address).toBe('Private Home Address 123');
    expect(sanitized.emergency_contact_name).toBe('Secret Relative');
    expect(sanitized.emergency_contact_phone).toBe('+1 555-0000');
    // Officer notes must remain confidential from the member!
    expect(sanitized.officer_notes).toBeUndefined();
  });

  it('allows authorized officers to view full details and officer notes', () => {
    const sanitized = sanitizeUser(sampleUser, 'GENERAL_SECRETARY', false);
    expect(sanitized.address).toBe('Private Home Address 123');
    expect(sanitized.emergency_contact_name).toBe('Secret Relative');
    expect(sanitized.emergency_contact_phone).toBe('+1 555-0000');
    expect(sanitized.officer_notes).toBe('Officer observation: Needs additional coaching on pitch');
  });
});

