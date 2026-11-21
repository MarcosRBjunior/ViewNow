export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'SYNC_IN_PROGRESS'
  | 'SYNC_EMPTY_RESULT'
  | 'DATABASE_ERROR'
  | 'YOUTUBE_AUTH'
  | 'YOUTUBE_QUOTA'
  | 'YOUTUBE_PLAYLIST_NOT_FOUND'
  | 'YOUTUBE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static notFound(message = 'Recurso não encontrado') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static unauthorized(message = 'Não autorizado') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
}
