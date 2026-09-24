import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import useInstallazione from '../../hooks/useInstallazione';

export default function InstallBanner() {
  const { evento, installa } = useInstallazione();
  const [chiuso, setChiuso] = useState(() => sessionStorage.getItem('gazzetta_install_chiuso') === '1');

  if (!evento || chiuso) return null;

  const chiudi = () => {
    sessionStorage.setItem('gazzetta_install_chiuso', '1');
    setChiuso(true);
  };

  return (
    <div className="install-banner">
      <span>Metti la Gazzetta sulla home: si legge anche offline</span>
      <button className="installa" onClick={installa}>Installa</button>
      <button className="chiudi" onClick={chiudi} aria-label="Chiudi"><X size={16} /></button>
    </div>
  );
}
