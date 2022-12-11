const { RpcClient } = require('jsonrpc-ts');

const elementsCoreEndpoint = 'http://admin1:123@localhost:18884';
const factoryAddress =
  'el1qqg0yjpdg0ctzpruffl87vynrw4sar0yuch7eakttgsmm2rk73mhqukhermhsywgq83xpe3804ap8qvn4jhnkk0rsjy3mxfx58';
const rpcClient = new RpcClient({
  url: elementsCoreEndpoint,
});

async function rpcCommand(method, params) {
  try {
    const response = await rpcClient.makeRequest({
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
      throw new Error(error.response.data.error.message);
    }
    if (error instanceof Error) {
      throw new Error(error.message);
    }
  }
}

async function main() {
  await rpcCommand('issueasset', [0, 0.00000001, false]);

  // mine a block
  await rpcCommand('generatetoaddress', [1, factoryAddress]);

  // get reiussuance token hash
  const issuances = await rpcCommand('listissuances');
  const issuance = issuances[0];

  // send to factory the reissuance token
  await rpcCommand('sendtoaddress', [
    factoryAddress,
    0.00000001,
    '',
    '',
    false,
    true,
    6,
    'economical',
    false,
    issuance.token,
  ]);

  // mine a block
  await rpcCommand('generatetoaddress', [1, factoryAddress]);

  console.log(`tokenID: ${issuance.token}`);
  console.log(`assetID: ${issuance.asset}`);

  return;
}

main();
