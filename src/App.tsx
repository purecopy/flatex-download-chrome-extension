import React from 'react';
import logo from './logo.svg';
import './App.css';
import { Button } from './Button';
import { useDownload } from './useDownload';

function App() {
  const { count, isLoading, downloadAll } = useDownload();

  function handleClickDownload() {
    downloadAll()
      .then(({ count }) => alert(`Download completed (${count} documents)`))
      .catch(() => alert('Download failed :('));
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <Button className="App-download-button" loading={isLoading} onClick={handleClickDownload} disabled={count <= 0}>
          Download
        </Button>
        <p>{count} Documents found</p>
      </header>
    </div>
  );
}

export default App;
