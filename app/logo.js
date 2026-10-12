// The Tiny Dot Labs mark, shared with the Labs site: a rounded triangle with a round hole, drawn in the current text colour.
// app/icon.svg is the same path, as the favicon.
export const logoPath = 'M28.36 11.96A25.56 25.56 0 0 1 71.64 11.96L97.07 52.4A19.08 19.08 0 0 1 80.92 81.64L19.08 81.64A19.08 19.08 0 0 1 2.93 52.4ZM34.56 47.57a15.39 15.39 0 1 0 30.78 0a15.39 15.39 0 1 0 -30.78 0Z';

export default function Logo(props) {
  return <svg viewBox="0 0 100 81.64" fill="currentColor" aria-hidden="true" {...props}><path fillRule="evenodd" d={logoPath} /></svg>;
}
