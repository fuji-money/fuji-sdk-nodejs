const { RpcClient } = require('jsonrpc-ts');

const elementsCoreEndpoint = 'http://admin1:123@localhost:18884';
const walletAddress = 'ert1qxxzaek2js7ggx8amt4uvxud0nz6l99ysk3574v';
const walletKeyWIF = 'cS4Ne6UqRKB5XYp3r5tJ96iRk55tufvrB2XRG8TfjFYN5sMZ1TuJ';
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
  // issue our asset
  await rpcCommand('issueasset', [0, 0.00000001, false]);

  // mine block
  await rpcCommand('generatetoaddress', [1, factoryAddress]);

  // get reiussuance token hash
  const issuances = await rpcCommand('listissuances');
  const issuance = issuances[0];

  console.log(`tokenID: ${issuance.token}`);
  console.log(`assetID: ${issuance.asset}`);

  // send to factory the reissuance token
  const txid = await rpcCommand('sendtoaddress', [
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
  console.log(`moved token to factory at txid: ${txid}`);

  // mine a block
  await rpcCommand('generatetoaddress', [1, factoryAddress]);

  // import wallet key
  await rpcCommand('importprivkey', [walletKeyWIF]);
  await rpcCommand('importaddress', [walletAddress]);

  // make smaller utxo of 6 BTC to hardcoded address
  await rpcCommand('sendtoaddress', [walletAddress, 6]);
  await rpcCommand('generatetoaddress', [1, factoryAddress]);

  // rescan blockchain
  await rpcCommand('rescanblockchain');

  return;
}

main();
