// `color` is a CSS color token from categoryColors().
export default function CategoryDot({ color }) {
  return <i className="category-dot" style={{ background: `var(${color})` }} aria-hidden="true" />;
}
