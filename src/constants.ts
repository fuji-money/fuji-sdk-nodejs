const Assets: Record<string, string> = {
  LBTC: '0x00',
  FUSD: '0x00',
};

const TestnetAssets: Record<string, string> = {
  LBTC: '144c654344aa716d6f3abcc1ca90e5641e4e2a7f633bc09fe3baf64585819a49',
  FUSD: '0d86b2f6a8c3b02a8c7c8836b83a081e68b7e2b4bcdfc58981fc5486f59f7518',
};

const RegtestAssets: Record<string, string> = {
  LBTC: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
  FUSD: '2dcf5a8834645654911964ec3602426fd3b9b4017554d3f9c19403e7fc1411d3',
};

const FEE_AMOUNT = 0.000005;

export { Assets, TestnetAssets, RegtestAssets, FEE_AMOUNT };
