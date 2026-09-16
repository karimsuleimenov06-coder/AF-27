import type { PositionGroup } from '../types/player'

export type FormationId = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2'

export interface FormationSlot {
  id: string
  label: string
  group: PositionGroup
  x: number
  y: number
}

export const FORMATION_IDS: FormationId[] = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2']

export const FORMATIONS: Record<FormationId, FormationSlot[]> = {
  '4-3-3': [
    { id: 'GK', label: 'GK', group: 'GK', x: 0.5, y: 0.06 },
    { id: 'LB', label: 'LB', group: 'DEF', x: 0.1, y: 0.24 },
    { id: 'CB1', label: 'CB', group: 'DEF', x: 0.34, y: 0.18 },
    { id: 'CB2', label: 'CB', group: 'DEF', x: 0.66, y: 0.18 },
    { id: 'RB', label: 'RB', group: 'DEF', x: 0.9, y: 0.24 },
    { id: 'CDM', label: 'CDM', group: 'MID', x: 0.5, y: 0.38 },
    { id: 'CM1', label: 'CM', group: 'MID', x: 0.28, y: 0.52 },
    { id: 'CM2', label: 'CM', group: 'MID', x: 0.72, y: 0.52 },
    { id: 'LW', label: 'LW', group: 'ATT', x: 0.14, y: 0.78 },
    { id: 'RW', label: 'RW', group: 'ATT', x: 0.86, y: 0.78 },
    { id: 'ST', label: 'ST', group: 'ATT', x: 0.5, y: 0.88 },
  ],
  '4-4-2': [
    { id: 'GK', label: 'GK', group: 'GK', x: 0.5, y: 0.06 },
    { id: 'LB', label: 'LB', group: 'DEF', x: 0.08, y: 0.24 },
    { id: 'CB1', label: 'CB', group: 'DEF', x: 0.34, y: 0.18 },
    { id: 'CB2', label: 'CB', group: 'DEF', x: 0.66, y: 0.18 },
    { id: 'RB', label: 'RB', group: 'DEF', x: 0.92, y: 0.24 },
    { id: 'LM', label: 'LM', group: 'MID', x: 0.12, y: 0.5 },
    { id: 'CM1', label: 'CM', group: 'MID', x: 0.36, y: 0.52 },
    { id: 'CM2', label: 'CM', group: 'MID', x: 0.64, y: 0.52 },
    { id: 'RM', label: 'RM', group: 'MID', x: 0.88, y: 0.5 },
    { id: 'ST1', label: 'ST', group: 'ATT', x: 0.38, y: 0.86 },
    { id: 'ST2', label: 'ST', group: 'ATT', x: 0.62, y: 0.86 },
  ],
  '4-2-3-1': [
    { id: 'GK', label: 'GK', group: 'GK', x: 0.5, y: 0.06 },
    { id: 'LB', label: 'LB', group: 'DEF', x: 0.1, y: 0.24 },
    { id: 'CB1', label: 'CB', group: 'DEF', x: 0.34, y: 0.18 },
    { id: 'CB2', label: 'CB', group: 'DEF', x: 0.66, y: 0.18 },
    { id: 'RB', label: 'RB', group: 'DEF', x: 0.9, y: 0.24 },
    { id: 'CDM1', label: 'CDM', group: 'MID', x: 0.34, y: 0.38 },
    { id: 'CDM2', label: 'CDM', group: 'MID', x: 0.66, y: 0.38 },
    { id: 'LM', label: 'LM', group: 'MID', x: 0.14, y: 0.58 },
    { id: 'CAM', label: 'CAM', group: 'MID', x: 0.5, y: 0.6 },
    { id: 'RM', label: 'RM', group: 'MID', x: 0.86, y: 0.58 },
    { id: 'ST', label: 'ST', group: 'ATT', x: 0.5, y: 0.86 },
  ],
  '3-5-2': [
    { id: 'GK', label: 'GK', group: 'GK', x: 0.5, y: 0.06 },
    { id: 'CB1', label: 'CB', group: 'DEF', x: 0.24, y: 0.2 },
    { id: 'CB2', label: 'CB', group: 'DEF', x: 0.5, y: 0.16 },
    { id: 'CB3', label: 'CB', group: 'DEF', x: 0.76, y: 0.2 },
    { id: 'LWB', label: 'LWB', group: 'DEF', x: 0.06, y: 0.44 },
    { id: 'CDM', label: 'CDM', group: 'MID', x: 0.5, y: 0.4 },
    { id: 'RWB', label: 'RWB', group: 'DEF', x: 0.94, y: 0.44 },
    { id: 'CM1', label: 'CM', group: 'MID', x: 0.32, y: 0.54 },
    { id: 'CM2', label: 'CM', group: 'MID', x: 0.68, y: 0.54 },
    { id: 'ST1', label: 'ST', group: 'ATT', x: 0.38, y: 0.86 },
    { id: 'ST2', label: 'ST', group: 'ATT', x: 0.62, y: 0.86 },
  ],
}
