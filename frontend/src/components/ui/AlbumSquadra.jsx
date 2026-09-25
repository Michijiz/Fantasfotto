import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { caricaImmagine } from './ImageUpload';
import Visore from './Visore';
import { miniatura } from '../../squadra';

// Quante foto tiene l'album: deve combaciare con MAX_ALBUM nel backend.
const MAX_ALBUM = 30;

// L'album della squadra: griglia di foto incollate come ritagli. Chi allena la
// squadra aggiunge (anche più foto insieme), cambia didascalie e toglie; l'admin
// può togliere da qualunque album. Toccando una foto si apre il visore.
export default function AlbumSquadra({ squadra, puoModificare, puoTogliere, onAggiornato }) {
  const mostraToast = useToast();
  const [aperta, setAperta] = useState(null);
  const [caricando, setCaricando] = useState(null); // { fatte, totali }

  // Le più recenti in testa.
  const foto = [...(squadra.album || [])].reverse();
  const allenatori = squadra.allenatori || [];
  const nomeAutore = (id) => allenatori.find((a) => String(a.id) === String(id))?.nomeVisualizzato || '';
  const posti = MAX_ALBUM - foto.length;

  const aggiungi = async (e) => {
    const input = e.target;
    const file = [...(input.files || [])];
    input.value = '';
    if (file.length === 0) return;
    const daFare = file.slice(0, posti);
    if (file.length > posti) mostraToast(`C'è posto solo per altre ${posti} foto`);

    setCaricando({ fatte: 0, totali: daFare.length });
    let riuscite = 0;
    for (const [i, f] of daFare.entries()) {
      try {
        const url = await caricaImmagine(f, 'squadre');
        await api.post('/api/squadre/mia/album', { url });
        riuscite += 1;
      } catch (err) {
        mostraToast(err.message || 'Una foto non è passata');
      }
      setCaricando({ fatte: i + 1, totali: daFare.length });
    }
    setCaricando(null);
    if (riuscite > 0) {
      await onAggiornato();
      mostraToast(riuscite === 1 ? 'Foto incollata nell\'album' : `${riuscite} foto incollate nell'album`);
    }
  };

  const salvaDidascalia = async (f, didascalia) => {
    await api.patch(`/api/squadre/mia/album/${f._id}`, { didascalia });
    await onAggiornato();
  };

  const togli = async (f) => {
    await api.delete(`/api/squadre/${squadra._id}/album/${f._id}`);
    await onAggiornato();
    mostraToast('Foto tolta dall\'album');
  };

  // Dopo aver tolto una foto l'indice aperto può uscire dall'elenco.
  const indiceAperto = aperta == null ? null : Math.min(aperta, foto.length - 1);

  return (
    <>
      {foto.length === 0 && !puoModificare && (
        <p className="ritaglio-vuoto">Nessuna foto. La squadra preferisce l&apos;anonimato.</p>
      )}

      {(foto.length > 0 || puoModificare) && (
        <div className="album-griglia">
          {puoModificare && posti > 0 && (
            <label className={`album-aggiungi${caricando ? ' spento' : ''}`}>
              <Plus size={30} weight="bold" />
              <span>{caricando ? `Sviluppo ${Math.min(caricando.fatte + 1, caricando.totali)} di ${caricando.totali}…` : 'Aggiungi foto'}</span>
              <input type="file" accept="image/*" multiple onChange={aggiungi} disabled={Boolean(caricando)} hidden />
            </label>
          )}
          {foto.map((f, i) => (
            <button key={f._id} type="button" className="album-foto" onClick={() => setAperta(i)} aria-label={f.didascalia || 'Apri la foto'}>
              <img src={miniatura(f.url, 500)} alt={f.didascalia || ''} loading="lazy" decoding="async" />
              {f.didascalia && <span className="didascalia">{f.didascalia}</span>}
            </button>
          ))}
        </div>
      )}

      {puoModificare && (
        <p className="dettaglio album-conto">{foto.length} di {MAX_ALBUM} foto</p>
      )}

      {indiceAperto != null && indiceAperto >= 0 && (
        <Visore
          foto={foto}
          indice={indiceAperto}
          onCambia={setAperta}
          onChiudi={() => setAperta(null)}
          nomeAutore={nomeAutore}
          puoModificare={puoModificare}
          puoTogliere={puoTogliere}
          onDidascalia={salvaDidascalia}
          onTogli={togli}
        />
      )}
    </>
  );
}
