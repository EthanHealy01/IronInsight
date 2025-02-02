export const METRIC_TYPES = {
  NUMBER: 'number',
  STRING: 'string',
  TIME: 'time',
  REPS_TIME: 'reps_time', 
};

export const DEFAULT_METRICS = [
  {
    id: 'reps',
    label: 'Reps',
    type: METRIC_TYPES.REPS_TIME,
    hasTimeOption: true,
    timeLabel: 'Seconds',
    repsLabel: 'Reps',
    placeholder: {
      time: 'Sec',
      reps: 'Reps'
    }
  },
  {
    id: 'weight',
    label: 'Weight',
    type: METRIC_TYPES.NUMBER,
    unit: 'kg',
  },
];

export const AVAILABLE_METRICS = [
  {
    id: 'rir',
    label: 'RIR',
    description: 'Reps In Reserve - How many more reps you could have done',
    type: METRIC_TYPES.NUMBER,
  },
  {
    id: 'rpe',
    label: 'RPE',
    description: 'Rate of Perceived Exertion (1-10)',
    type: METRIC_TYPES.NUMBER,
  },
  {
    id: 'tempo',
    label: 'Tempo',
    description: 'Exercise timing (e.g., "3-1-3" for eccentric-pause-concentric)',
    type: METRIC_TYPES.STRING,
  },
  {
    id: 'rom',
    label: 'ROM',
    description: 'Range of Motion notes',
    type: METRIC_TYPES.STRING,
  },
  {
    id: 'rest',
    label: 'Rest',
    description: 'Rest time between sets',
    type: METRIC_TYPES.TIME,
  },
  {
    id: 'bar_height',
    label: 'Bar Height',
    description: 'Starting position height for lifts',
    type: METRIC_TYPES.NUMBER,
    unit: 'cm',
  },
  {
    id: 'band_resistance',
    label: 'Band',
    description: 'Resistance band strength used',
    type: METRIC_TYPES.STRING,
  },
  {
    id: 'chain_weight',
    label: 'Chains',
    description: 'Additional chain weight used',
    type: METRIC_TYPES.NUMBER,
    unit: 'kg',
  },
  {
    id: 'perceived_difficulty',
    label: 'Difficulty',
    description: 'Subjective difficulty rating (1-5)',
    type: METRIC_TYPES.NUMBER,
  },
  {
    id: 'form_notes',
    label: 'Form',
    description: 'Notes about exercise form',
    type: METRIC_TYPES.STRING,
  },
];