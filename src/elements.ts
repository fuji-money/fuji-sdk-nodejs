import { RpcClient } from 'jsonrpc-ts';

export class ElementsWrapper {
  constructor(private readonly elementsCore: RpcClient) {}
  public async rpcCommand(method: string, params: any = []): Promise<any> {
    try {
      const response = await this.elementsCore.makeRequest({
        method,
        params,
        id: Math.random(),
        jsonrpc: '2.0',
      });
      if (response.status !== 200)
        throw new Error(response?.data?.error?.message);

      return response.data.result;
    } catch (error) {
      if (error && error.hasOwnProperty('isAxiosError')) {
        throw new Error((error as any).response.data.error.message);
      }
      if (error instanceof Error) {
        throw new Error(error.message);
      }
    }
  }
}
