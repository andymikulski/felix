export class ColorGradient {
  constructor(public colors: [number, number, number][]) {}

  private getColorRGB = (t: number) => {
    t = Math.max(0, Math.min(1, t));
    const i = Math.floor(t * (this.colors.length - 1));
    const a = this.colors[i];
    const b = this.colors[i + 1] || this.colors[i];
    const u = t * (this.colors.length - 1) - i;
    const lerped = a.map((v, j) => Math.round(v + u * (b[j] - v)));
    return lerped;
  };

  public getColorAsRGBString = (t: number) => {
    const c = this.getColorRGB(t);
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  };

  public getColorAsHexString = (t: number) => {
    const rgb = this.getColorRGB(t);
    return (
      '#' +
      rgb
        .map((color) => {
          const clamped = Math.max(0, Math.min(255, color));
          const hex = clamped.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  };
}
