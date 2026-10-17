export interface ImportedMember {
  fullName: string;
  preferredName: string;
  email: string;
  phone: string;
  wing: string;
  wingRole: string;
  birthDate: string;
  expectedGraduationYear: string;
  joinDate: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  officerNotes: string;
}

export type ImportedMinistryWing =
  | 'Family of Praise'
  | 'Asaphites'
  | 'Vimmies'
  | 'General Leadership';

const fieldAliases: Record<keyof ImportedMember, string[]> = {
  fullName: ['name', 'fullname', 'membername', 'choristername'],
  preferredName: ['preferredname', 'nickname', 'knownas'],
  email: ['email', 'emailaddress', 'e-mail'],
  phone: ['phone', 'phonenumber', 'telephone', 'mobile', 'contactnumber'],
  wing: ['wing', 'ministry', 'department', 'group'],
  wingRole: ['wingrole', 'ministryrole', 'voicepart', 'specialization', 'instrument', 'position'],
  birthDate: ['birthdate', 'dateofbirth', 'dob', 'birthday'],
  expectedGraduationYear: ['expectedgraduationyear', 'graduationyear', 'gradyear', 'classof'],
  joinDate: ['joindate', 'datejoined', 'membershipdate'],
  address: ['address', 'homeaddress'],
  emergencyContactName: ['emergencycontactname', 'emergencyname', 'nextofkin', 'nextofkinname'],
  emergencyContactPhone: ['emergencycontactphone', 'emergencyphone', 'nextofkinphone'],
  officerNotes: ['officernotes', 'notes', 'remarks'],
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parseCsvGrid(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (quoted) {
    throw new Error('The CSV contains an unclosed quoted value.');
  }

  row.push(cell.trim());
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}

export function mapMemberGrid(grid: string[][]): ImportedMember[] {
  if (grid.length < 2) return [];

  const headers = grid[0].map(normalizeHeader);
  const indexes = new Map<keyof ImportedMember, number>();

  for (const field of Object.keys(fieldAliases) as (keyof ImportedMember)[]) {
    const aliases = fieldAliases[field].map(normalizeHeader);
    const index = headers.findIndex((header) => aliases.includes(header));
    if (index !== -1) indexes.set(field, index);
  }

  const firstNameIndex = headers.findIndex((header) => ['firstname', 'givenname'].includes(header));
  const lastNameIndex = headers.findIndex((header) => ['lastname', 'surname', 'familyname'].includes(header));

  return grid.slice(1).flatMap((cells) => {
    const getValue = (field: keyof ImportedMember) =>
      (indexes.has(field) ? cells[indexes.get(field)!] : '')?.trim() || '';
    const rawWing = getValue('wing');
    const fullName = getValue('fullName') || [
      firstNameIndex === -1 ? '' : cells[firstNameIndex] || '',
      lastNameIndex === -1 ? '' : cells[lastNameIndex] || '',
    ].join(' ').trim();
    const member: ImportedMember = {
      fullName,
      preferredName: getValue('preferredName'),
      email: getValue('email').toLowerCase(),
      phone: getValue('phone'),
      wing: normalizeMemberWing(rawWing) || rawWing,
      wingRole: getValue('wingRole'),
      birthDate: getValue('birthDate'),
      expectedGraduationYear: getValue('expectedGraduationYear'),
      joinDate: getValue('joinDate'),
      address: getValue('address'),
      emergencyContactName: getValue('emergencyContactName'),
      emergencyContactPhone: getValue('emergencyContactPhone'),
      officerNotes: getValue('officerNotes'),
    };

    return Object.values(member).some(Boolean) ? [member] : [];
  });
}

export function normalizeMemberWing(value: string): ImportedMinistryWing | null {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, '');
  if ([
    'familyofpraise',
    'familyofpraisechoir',
    'choir',
    'choirministry',
    'familyvinechoir',
  ].includes(normalized)) {
    return 'Family of Praise';
  }
  if ([
    'asaphites',
    'asaphitesinstrumentalists',
    'instrumentalist',
    'instrumentalists',
    'instrumentalministry',
    'band',
  ].includes(normalized)) {
    return 'Asaphites';
  }
  if ([
    'vimmies',
    'vimmiesdancers',
    'dance',
    'dancers',
    'danceministry',
  ].includes(normalized)) {
    return 'Vimmies';
  }
  if (['generalleadership', 'leadership'].includes(normalized)) return 'General Leadership';
  return null;
}
