import { describe, expect, it } from 'vitest';
import { mapMemberGrid, normalizeMemberWing, parseCsvGrid } from '@/lib/utils/member-import';

describe('member import parsing', () => {
  it('parses quoted CSV values, embedded commas, escaped quotes, and multiline cells', () => {
    expect(parseCsvGrid(
      '\uFEFFName,Email,Address,Notes\r\n"Ada Lovelace",ada@example.org,"12 Vine St, Accra","Choir ""lead""\nmember"\r\n'
    )).toEqual([
      ['Name', 'Email', 'Address', 'Notes'],
      ['Ada Lovelace', 'ada@example.org', '12 Vine St, Accra', 'Choir "lead"\nmember'],
    ]);
  });

  it('maps common column names and combines first and last names', () => {
    expect(mapMemberGrid([
      ['First Name', 'Last Name', 'E-mail', 'Telephone', 'Department', 'Voice Part', 'DOB'],
      ['Ama', 'Mensah', 'AMA@example.org', '+233 123', 'Choir', 'Soprano', '2000-02-03'],
    ])).toEqual([{
      fullName: 'Ama Mensah',
      preferredName: '',
      email: 'ama@example.org',
      phone: '+233 123',
      wing: 'Family of Praise',
      wingRole: 'Soprano',
      birthDate: '2000-02-03',
      joinDate: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      officerNotes: '',
    }]);
  });

  it('accepts incomplete optional fields and ignores completely blank rows', () => {
    expect(mapMemberGrid([
      ['Full Name', 'Email', 'Phone', 'Address'],
      ['Kojo Mensah', 'kojo@example.org', '', ''],
      ['', '', '', ''],
    ])).toMatchObject([{
      fullName: 'Kojo Mensah',
      email: 'kojo@example.org',
      phone: '',
      address: '',
    }]);
  });

  it('imports a name without requiring an email address', () => {
    expect(mapMemberGrid([
      ['Name', 'Phone'],
      ['Kojo Mensah', '+233 123'],
    ])).toMatchObject([{
      fullName: 'Kojo Mensah',
      email: '',
      phone: '+233 123',
    }]);
  });

  it('reports malformed quoted CSV values', () => {
    expect(() => parseCsvGrid('Name,Email\n"Ada,ada@example.org')).toThrow('unclosed quoted value');
  });

  it('normalizes recognized ministry wings and rejects unknown labels', () => {
    expect(normalizeMemberWing('Family of Praise (Choir)')).toBe('Family of Praise');
    expect(normalizeMemberWing('Instrumentalists')).toBe('Asaphites');
    expect(normalizeMemberWing('something else')).toBeNull();
  });
});
