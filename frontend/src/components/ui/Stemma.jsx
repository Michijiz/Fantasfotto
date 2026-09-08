// Lo stemma di una squadra è ora sempre un'immagine caricata (vedi ImageUpload nel
// Profilo). Questo componente centralizza il rendering: un cerchietto con la foto,
// oppure lo scudo di riserva se la squadra non ne ha ancora caricato una.
export default function Stemma({ src, size = 28, className = '' }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={className}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: '1px solid var(--ink-soft)', display: 'inline-block', verticalAlign: 'middle'
        }}
      />
    );
  }
  return <span className={className} style={{ fontSize: size, lineHeight: 1 }}>🛡️</span>;
}
