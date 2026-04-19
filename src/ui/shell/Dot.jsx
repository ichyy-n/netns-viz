export function Dot({ color, size = 6, style }) {
  return <span style={{ width: size, height: size, borderRadius: size / 2,
    background: color, display: 'inline-block', ...style }} />;
}
