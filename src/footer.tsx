import './footer.css';

export function Footer(): JSX.Element {
  return (
    <a
      className="Footer"
      href="https://paypal.me/heneis?country.x=AT&locale.x=de_DE"
      target="_blank"
      referrerPolicy="no-referrer"
      title="Donation Link"
      rel="noreferrer"
    >
      Enjoying the Extension? <br />
      Buy me some coffee :&#41;
      <br />
      <span className="FooterClick">*click* ☕️</span>
    </a>
  );
}
