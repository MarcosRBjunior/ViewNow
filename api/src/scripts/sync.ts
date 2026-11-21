// Executa a sincronização YouTube → Supabase pelo terminal.
// Uso: npm run sync
import { AppError } from '../errors/AppError.js';
import { runSync } from '../services/sync.service.js';

try {
  const result = await runSync('cli');
  console.log(
    `Sync concluída: ${result.videosFetched} vídeo(s) gravados, ${result.removed} removido(s), ${result.durationMs} ms`,
  );
} catch (error) {
  const message = error instanceof AppError ? `${error.code}: ${error.message}` : String(error);
  console.error(`Sync falhou → ${message}`);
  process.exitCode = 1;
}
