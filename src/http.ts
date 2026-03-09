export type HttpClientOptions = {
  baseUrl: string;
  token: string;
  userAgent?: string;
};

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly bodyText?: string
  ) {
    super(message);
  }
}

export async function httpGetJson<T>(
  path: string,
  options: HttpClientOptions,
  query?: Record<string, string | undefined>
): Promise<T> {
  const url = new URL(path, options.baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Figma-Token': options.token,
      'User-Agent': options.userAgent ?? 'figma-sync/0.1.0',
      'Accept': 'application/json'
    }
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new HttpError(
      `HTTP ${response.status} for ${url.toString()}`,
      response.status,
      url.toString(),
      bodyText
    );
  }

  return JSON.parse(bodyText) as T;
}
