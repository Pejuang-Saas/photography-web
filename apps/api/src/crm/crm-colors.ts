/** Badge colours an admin can give a category. The web app maps each key to its own styling. */
export const CRM_COLORS = ['green', 'blue', 'amber', 'purple', 'rose', 'zinc'] as const;
export type CrmColor = (typeof CRM_COLORS)[number];
