// Il sorgente importa senza estensione (come vuole Vite): per i test, Node la aggiunge.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return next(`${specifier}.js`, context);
    throw err;
  }
}
