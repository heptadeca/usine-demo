export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createErrorResponse(error: any, status = 500) {
  const message = error instanceof Error ? error.message : 'Internal server error';
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function parseRequestBody<T>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'Invalid JSON body');
  }
}

export function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
