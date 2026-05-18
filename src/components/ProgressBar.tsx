import './ProgressBar.css';

type Props = {
  total: number;
  success: number;
  failed: number;
};

export function ProgressBar({ total, success, failed }: Props) {
  const safeTotal = Math.max(total, 1);
  const successPct = (success / safeTotal) * 100;
  const failedPct = (failed / safeTotal) * 100;

  return (
    <div className="ProgressBar">
      <div className="ProgressBar-track">
        <div className="ProgressBar-success" style={{ width: `${successPct}%` }} />
        <div className="ProgressBar-failed" style={{ width: `${failedPct}%` }} />
      </div>
      <div className="ProgressBar-label">
        {success + failed} / {total}
        {failed > 0 ? <span className="ProgressBar-failedLabel"> ({failed} fehlgeschlagen)</span> : null}
      </div>
    </div>
  );
}
