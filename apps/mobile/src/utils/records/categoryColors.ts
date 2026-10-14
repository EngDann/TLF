export const CATEGORY_COLOR_PALETTE = [
  '#6A66FF',
  '#2CB67D',
  '#F25F5C',
  '#3A86FF',
  '#FFB703',
  '#8E88FF',
  '#4ECDC4',
  '#FF6B6B',
]

export const FALLBACK_CATEGORY_COLOR = CATEGORY_COLOR_PALETTE[0] ?? '#6A66FF'

export const PALETTE_SIZE = CATEGORY_COLOR_PALETTE.length || 1

export function resolveCategoryColor(_name: string, index: number): string {
  return CATEGORY_COLOR_PALETTE[index % PALETTE_SIZE] ?? FALLBACK_CATEGORY_COLOR
}
