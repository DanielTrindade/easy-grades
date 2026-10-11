import { ERROR_MESSAGES, type ErrorCode } from '@easy-grades/core';

export const ERROR_STATUS: Record<ErrorCode, number> = {
  INVALID_UPLOAD: 400,
  MISSING_FILE: 400,
  INVALID_PDF: 400,
  TOO_LARGE: 413,
  TOO_MANY_PAGES: 422,
  NOT_CURRICULUM: 422,
  NOT_TRANSCRIPT: 422,
  CURRICULUM_MISMATCH: 422,
  PARSE_TIMEOUT: 422,
  RATE_LIMITED: 429,
  NOT_FOUND: 404,
  INTERNAL: 500,
};

export class ParseError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'ParseError';
    this.code = code;
    this.statusCode = ERROR_STATUS[code];
  }
}
