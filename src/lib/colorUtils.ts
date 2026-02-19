export function hexToRgbValues(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [142, 180, 227];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

export function hexToRgbString(hex: string): string {
  const [r, g, b] = hexToRgbValues(hex);
  return `${r}, ${g}, ${b}`;
}

function srgbToLinear(val: number): number {
  const v = val / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgbValues(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function getIconFilter(backgroundHex: string): string {
  const luminance = getLuminance(backgroundHex);
  return luminance > 0.35 ? 'brightness(0)' : 'brightness(0) invert(1)';
}
