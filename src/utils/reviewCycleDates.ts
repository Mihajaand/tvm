export const toNullableReviewDate = (date: string | null | undefined): string | null => {
  const normalized = date?.trim();
  return normalized ? normalized : null;
};