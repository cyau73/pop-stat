// src/app/component/ui/constants.ts
export const DISPLAY_ORDER: Record<string, string[]> = {
    SG: [
        'Total Population',
        'Singapore Citizen Population',
        'Non-Citizens Population',
        'Non-Resident Population',
        'Permanent Resident Population',
        'Work Permit Holders',
        'Migrant Domestic Workers',
        'Employment Pass Holders',
        'S Pass Holders',
        'Long-Term Visit Pass Holders And Dependant\'s Pass Holders',
        'Student Pass Holders',
        'Work Permit Holders (Count)',
        'Migrant Domestic Workers (Count)',
        'Employment Pass Holders (Count)',
        'S Pass Holders (Count)',
        'Long-Term Visit Pass Holders And Dependant\'s Pass Holders (Count)',
        'Student Pass Holders (Count)',
    ],
    MY: [
        'Total Population',
        'CITIZEN',
        'NON CITIZEN',
    ]
}

export const COLOR_MAP = {
    citizens: 'bg-emerald-500',
    nonCitizens: 'bg-blue-500',
    workPermits: 'bg-amber-500',
    employmentPass: 'bg-amber-400',
    sPassHolders: 'bg-amber-300',
    migrantWorkers: 'bg-amber-200',
    others: 'bg-amber-100',
};

export const COUNTRY_SIDEBAR_CONFIGS: Record<string, any[]> = {
    SG: [
        { id: 'citizens', label: 'Singapore Citizens', valueKey: 'citizens', color: COLOR_MAP.citizens, isNested: false },
        { id: 'nonCitizens', label: 'Non-Citizens Total', valueKey: 'nonCitizens', color: COLOR_MAP.nonCitizens, isNested: false },
        { id: 'pr', label: 'Permanent Residents', valueKey: 'permanentResidents', color: COLOR_MAP.workPermits, isNested: true },
        { id: 'work', label: 'Work Permit Holders', valueKey: 'workPermits', color: COLOR_MAP.workPermits, isNested: true },
        { id: 'migrant', label: 'Migrant Domestic Workers', valueKey: 'migrantWorkers', color: COLOR_MAP.migrantWorkers, isNested: true },
        { id: 'pass', label: 'Employment/S-Pass Holders', valueKey: 'passCount', color: COLOR_MAP.employmentPass, isNested: true },
        { id: 'others', label: 'Long-Term/Students/Dependants', valueKey: 'others', color: COLOR_MAP.others, isNested: true },
    ],
    MY: [
        { id: 'total', label: 'Total Population', valueKey: 'total', color: 'bg-slate-500', isNested: false },
        { id: 'citizens', label: 'Malaysian Citizens', valueKey: 'citizens', color: 'bg-emerald-500', isNested: false },
        { id: 'nonCitizens', label: 'Non-Citizens Total', valueKey: 'nonCitizens', color: 'bg-indigo-500', isNested: false },
    ],
};

export const COUNTRY_CONFIGS = [
    { code: 'SG', mainPrefix: 'SG_M810001_', breakdownPrefix: 'SG_M810791' },
    { code: 'MY', mainPrefix: 'MY_', breakdownPrefix: '' },
    { code: 'TH', mainPrefix: 'TH_M_MAIN_', breakdownPrefix: 'TH_M_BREAKDOWN_' }, // Easily add Thailand, etc.
];

export const COUNTRY_METADATA: Record<string, { label: string, hasNestedBreakdown: boolean }> = {
    SG: { label: 'Singapore', hasNestedBreakdown: true },
    MY: { label: 'Malaysia', hasNestedBreakdown: false },
    TH: { label: 'Thailand', hasNestedBreakdown: false },
    // Adding a new country is now just one line here
};