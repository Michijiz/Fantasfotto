import { useEffect, useState } from 'react';

export default function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [chiuso, setChiuso] = useState(() => sessionStorage.getItem('gazzetta_install_chiuso') === '1');

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!promptEvent || chiuso) return null;

  const installa = async () => {
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };

  const chiudi = () => {
    sessionStorage.setItem('gazzetta_install_chiuso', '1');
    setChiuso(true);
  };

  return (
    <div className="install-banner">
      <span>Installa La Gazzetta sulla home — anche offline</span>
      <button className="installa" onClick={installa}>Installa</button>
      <button className="chiudi" onClick={chiudi}>✕</button>
    </div>
  );
}
