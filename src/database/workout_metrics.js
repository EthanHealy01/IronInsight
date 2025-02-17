export const METRIC_TYPES = {
  NUMBER: 'number',
  STRING: 'string', 
};

export const AVAILABLE_METRICS = [
  {
    baseId: 'reps',
    label: 'Reps',
    description: 'Reps - Number of repetitions for the exercise',
    type: METRIC_TYPES.NUMBER,
  },
  {
    baseId: 'weight',
    label: 'Weight',
    description: 'Weight - Weight used for the exercise',
    type: METRIC_TYPES.NUMBER,
    unit: 'kg',
  },
  {
    baseId: 'seconds',
    label: 'Seconds',
    description: "Seconds - Time in seconds for the exercise",
    type: METRIC_TYPES.NUMBER,
  },
  {
    baseId: 'weight_assistance',
    label: 'Assistance Weight',
    description: 'Assistance Weight - Weight used to assist with the exercise',
    type: METRIC_TYPES.NUMBER,
    unit: 'kg',
  },
  {
    baseId: 'rir',
    label: 'RIR',
    description: 'Reps In Reserve - How many more reps you could have done',
    type: METRIC_TYPES.NUMBER,
  },
  {
    baseId: 'rpe',
    label: 'RPE',
    description: 'Rate of Perceived Exertion - How much effort you think you exerted in this set (1-10)',
    type: METRIC_TYPES.NUMBER,
  },
  {
    baseId: 'rom',
    label: 'ROM',
    description: 'Range of Motion - Notes on your range notes',
    type: METRIC_TYPES.STRING,
  },
  {
    baseId: 'rest',
    label: 'Rest',
    description: 'Rest - Time taken for your break between this set and the next',
    type: METRIC_TYPES.STRING,
  },
  {
    baseId: 'form_notes',
    label: 'Form',
    description: 'Notes about exercise form',
    type: METRIC_TYPES.STRING,
  },
];