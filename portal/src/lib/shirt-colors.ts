// Shirt Size Color Mapping for Pack Mode

export interface SizeColorConfig {
  bg: string;
  text: string;
}

export const shirtSizeColors: Record<string, SizeColorConfig> = {
  'XS': { bg: '#9CA3AF', text: 'white' },
  'S': { bg: '#FDE047', text: 'black' },
  'M': { bg: '#3B82F6', text: 'white' },
  'L': { bg: '#EF4444', text: 'white' },
  'XL': { bg: '#A855F7', text: 'white' },
  '2XL': { bg: '#F97316', text: 'white' },
  'XXL': { bg: '#F97316', text: 'white' }, // Alias for 2XL
  '3XL': { bg: '#14B8A6', text: 'white' },
  'XXXL': { bg: '#14B8A6', text: 'white' }, // Alias for 3XL
};

export function getSizeColors(size: string): SizeColorConfig {
  const normalized = size?.toUpperCase().trim() || '';
  return shirtSizeColors[normalized] || { bg: '#6B7280', text: 'white' };
}
