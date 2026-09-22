import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { User, BookOpen, SignOut, X } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { useTema } from '../../context/TemaContext';
import { sfondoTema } from '../../temi';
import { etichettaRuolo } from '../../ruoli';
import Sheet from '../ui/Sheet';
import SelettoreTema from '../ui/SelettoreTema';
import '../../styles/drawer.css';

// Menu profilo aperto dall'hamburger nell'header. Pannello in vetro della stessa
// famiglia della bottom nav (stile adattato dal Glass Sidebar di AI Canvas:
// mattonelle icona ed etichette che entrano a cascata), ma a scomparsa e non a
// colonna fissa, che su telefono ruberebbe larghezza agli articoli.
// "Le squadre della lega" non c'è più: è già nella bottom nav.

const MOLLA_PANNELLO = { type: 'spring', stiffness: 320, damping: 30 };

export default function Drawer({ aperto, onChiudi }) {
  const { utente, logout } = useAuth();
  const { temaId, tema, cambiaTema } = useTema();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sceltaAperta, setSceltaAperta] = useState(false);

  // Esc chiude il menu (tastiera, desktop).
  useEffect(() => {
    if (!aperto) return;
    const suTasto = (e) => { if (e.key === 'Escape') onChiudi(); };
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, [aperto, onChiudi]);

  const vai = (path) => {
    onChiudi();
    navigate(path);
  };

  const apriColori = () => {
    onChiudi();
    setSceltaAperta(true);
  };

  // tipo (diventa la classe voce-<tipo>; niente "link" nudo: global.css ha già
  // una regola button.link): 'link' (pagina, può essere attiva), 'azione', 'esci' (rosso).
  // mattonella: contenuto del quadrato a sinistra (icona o bollino del tema).
  const voci = [
    {
      chiave: 'profilo', label: 'Il mio profilo', tipo: 'link',
      attiva: pathname.startsWith('/profilo'), onClick: () => vai('/profilo'),
      mattonella: <User size={20} weight={pathname.startsWith('/profilo') ? 'fill' : 'regular'} />
    },
    {
      chiave: 'regolamento', label: 'Regolamento e FAQ', tipo: 'link',
      attiva: pathname.startsWith('/regolamento'), onClick: () => vai('/regolamento'),
      mattonella: <BookOpen size={20} weight={pathname.startsWith('/regolamento') ? 'fill' : 'regular'} />
    },
    {
      chiave: 'colori', label: 'Colori della Gazzetta', sotto: tema.nome, tipo: 'azione',
      onClick: apriColori,
      mattonella: <span className="drawer-pallina" style={{ background: sfondoTema(tema.colori) }} />
    },
    {
      chiave: 'esci', label: 'Esci', tipo: 'esci',
      onClick: () => { onChiudi(); logout(); },
      mattonella: <SignOut size={20} />
    }
  ];

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {aperto && (
          <>
            <motion.div
              key="scrim"
              className="drawer-scrim"
              onClick={onChiudi}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.aside
              key="pannello"
              className="drawer-vetro"
              role="dialog"
              aria-modal="true"
              aria-label="Menu profilo"
              initial={{ x: '-110%', opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-110%', opacity: 0.6, transition: { duration: 0.2, ease: 'easeIn' } }}
              transition={MOLLA_PANNELLO}
            >
              <div className="drawer-testa">
                <div className="drawer-chi">
                  <div className="nome">{utente?.nomeVisualizzato}</div>
                  <div className="ruolo">{etichettaRuolo(utente)}</div>
                </div>
                <button className="drawer-chiudi" onClick={onChiudi} aria-label="Chiudi menu">
                  <X size={18} />
                </button>
              </div>

              <nav className="drawer-voci">
                {voci.map((v, i) => (
                  <motion.button
                    key={v.chiave}
                    className={`drawer-voce voce-${v.tipo}${v.attiva ? ' attiva' : ''}`}
                    onClick={v.onClick}
                    aria-current={v.attiva ? 'page' : undefined}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut', delay: 0.12 + i * 0.04 } }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <span className="mattonella">{v.mattonella}</span>
                    <span className="testi">
                      <span className="label">{v.label}</span>
                      {v.sotto && <span className="sotto">{v.sotto}</span>}
                    </span>
                  </motion.button>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <Sheet
        aperto={sceltaAperta}
        onChiudi={() => setSceltaAperta(false)}
        titolo="Colori della Gazzetta"
        sottotitolo={`Ora: ${tema.nome}`}
        grande
      >
        <p className="tema-nota">
          Scegli la squadra che tifi: cambiano carta, inchiostro e accenti di tutta
          l&apos;app. Resta salvato sul tuo profilo, non solo su questo telefono.
        </p>
        <SelettoreTema valore={temaId} onSceglie={cambiaTema} />
      </Sheet>
    </MotionConfig>
  );
}
