import logo from './logo.svg';
import './app.css';
import { Button } from './button';
import { useDownload } from './use-download';
import { Footer } from './footer';
import { ProgressBar } from './components/ProgressBar';
import { ProgressList } from './components/ProgressList';
import { errorMessage } from './lib/errors';

function App() {
  const { state, count, downloadAll, retryFailed } = useDownload();
  const isRunning = state.phase === 'running' || state.phase === 'zipping';
  const showProgress = state.items.length > 0 && state.phase !== 'idle';

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        {state.phase === 'idle' || (state.phase === 'completed' && state.items.length === 0) ? (
          <>
            <Button
              className="App-download-button"
              loading={isRunning}
              onClick={downloadAll}
              disabled={count <= 0 || isRunning}
            >
              Herunterladen
            </Button>
            <p>{count} Dokumente gefunden</p>
          </>
        ) : null}

        {state.finalError ? (
          <div className="App-error">
            <p>{errorMessage(state.finalError)}</p>
            <Button onClick={downloadAll} disabled={!count}>
              Erneut versuchen
            </Button>
          </div>
        ) : null}

        {showProgress && !state.finalError ? (
          <div className="App-progress">
            <ProgressBar
              total={state.totalCount}
              success={state.successCount}
              failed={state.failedCount}
            />
            <ProgressList items={state.items} />

            {state.phase === 'completed' ? (
              <div className="App-actions">
                <p className="App-summary">
                  {state.successCount === state.totalCount
                    ? `Alle ${state.totalCount} Dokumente heruntergeladen`
                    : `${state.successCount} von ${state.totalCount} heruntergeladen — ${state.failedCount} fehlgeschlagen`}
                </p>
                {state.failedCount > 0 ? (
                  <Button onClick={retryFailed}>Fehlgeschlagene wiederholen</Button>
                ) : null}
                <Button onClick={downloadAll}>Neuen Download starten</Button>
              </div>
            ) : (
              <p className="App-summary">
                {state.phase === 'zipping' ? 'ZIP wird gepackt …' : 'Dokumente werden heruntergeladen …'}
              </p>
            )}
          </div>
        ) : null}
      </header>
      <Footer />
    </div>
  );
}

export default App;
