import './footer.css';

export function Footer(): JSX.Element {
  return (
    <a
      className="Footer"
      href="https://paypal.me/heneis?country.x=AT&locale.x=de_DE"
      target="_blank"
      referrerPolicy="no-referrer"
      title="Spenden-Link"
      rel="noreferrer"
    >
      Gefällt dir die Erweiterung? <br />
      Spendier mir einen Kaffee :&#41;
      <br />
      <span className="FooterClick">*klick* ☕️</span>
    </a>
  );
}
