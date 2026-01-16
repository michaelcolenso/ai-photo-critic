
export interface SuggestedEdit {
  edit: string;
  reason: string;
}

export interface PhotoAnalysis {
  rating: number;
  projected_rating: number;
  composition: string;
  lighting: string;
  subject: string;
  overall_comment: string;
  suggested_edits: SuggestedEdit[];
}
