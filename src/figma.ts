import { httpGetJson, type HttpClientOptions } from './http.js';

export type FigmaClient = {
  getFile: (fileKey: string) => Promise<unknown>;
  getFileNodes: (fileKey: string, nodeIds: string[]) => Promise<unknown>;
  getImageUrls: (fileKey: string, nodeIds: string[], format?: 'png' | 'svg' | 'pdf') => Promise<unknown>;
};

export function createFigmaClient(token: string): FigmaClient {
  const options: HttpClientOptions = {
    baseUrl: 'https://api.figma.com',
    token
  };

  return {
    async getFile(fileKey: string) {
      return httpGetJson(`/v1/files/${encodeURIComponent(fileKey)}`, options);
    },
    async getFileNodes(fileKey: string, nodeIds: string[]) {
      // GET /v1/files/:key/nodes?ids=...
      return httpGetJson(`/v1/files/${encodeURIComponent(fileKey)}/nodes`, options, {
        ids: nodeIds.join(',')
      });
    },
    async getImageUrls(fileKey: string, nodeIds: string[], format = 'png') {
      // GET /v1/images/:key?ids=...&format=png
      return httpGetJson(`/v1/images/${encodeURIComponent(fileKey)}`, options, {
        ids: nodeIds.join(','),
        format
      });
    }
  };
}
