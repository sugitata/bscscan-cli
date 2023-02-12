#!/usr/bin/env node

import figlet from 'figlet';
import { Command } from 'commander';
import chalk from 'chalk';
import axios from 'axios';

const program = new Command();

console.log(
  chalk.red(figlet.textSync('bscscan cli', { horizontalLayout: 'full' }))
);

program
  .version('1.0.0')
  .description('An example CLI for bscscan cli')
  .option('-w, --wallet <value>', 'Wallet address')
  .option('-c, --contract <value>', 'Contract address')
  .option('-k, --key <value>', 'API key')
  .parse(process.argv);

const options = program.opts();

const hasOptions = options.wallet && options.contract && options.key;
if (!hasOptions) {
  program.outputHelp();
}

/**
 * @see https://docs.bscscan.com/api-endpoints/accounts#get-a-list-of-bep-20-token-transfer-events-by-address
 */
interface TokenMovement {
  hash: string; // txid
  timeStamp: string;
  tokenSymbol: string;
  value: string;
}

interface AssetBalance {
  symbol: string;
  balance: number;
}

interface Input {
  walletAddress?: string;
  contractAddress?: string;
  apiKey?: string;
}

async function getTokenMovements(input: Input): Promise<TokenMovement[]> {
  const response = await axios.get(`https://api.bscscan.com/api`, {
    params: {
      module: 'account',
      action: 'tokentx',
      contractaddress: input.contractAddress,
      address: input.walletAddress,
      page: 1,
      offset: 5,
      startblock: 0,
      endblock: 999999999,
      sort: 'asc',
      apikey: input.apiKey,
    },
  });
  const movements = response.data.result as TokenMovement[];
  return movements;
}

async function displayTokenMovements(movements: TokenMovement[]) {
  const formatted = movements.map((m) => {
    return {
      id: m.hash,
      date: new Date(Number(m.timeStamp) * 1000),
      'token symbol': m.tokenSymbol,
      amount: m.value,
    };
  });
  console.table(formatted);
}

async function computeAssetBalances(
  movements: TokenMovement[]
): Promise<AssetBalance[]> {
  const assets: AssetBalance[] = [];
  for (const movement of movements) {
    const existing = assets.find(
      (balance) => balance.symbol === movement.tokenSymbol
    );
    if (existing) {
      existing.balance += Number(movement.value);
    } else {
      assets.push({
        symbol: movement.tokenSymbol,
        balance: Number(movement.value),
      });
    }
  }
  return assets;
}

async function main() {
  const sampleInput: Input = {
    walletAddress: '0x7bb89460599dbf32ee3aa50798bbceae2a5f7f6a',
    contractAddress: '0xc9849e6fdb743d08faee3e34dd2d1bc69ea11a51',
    apiKey: 'YourApiKeyToken',
  };
  const input: Input = {
    walletAddress: options.wallet,
    contractAddress: options.contract,
    apiKey: options.key,
  };
  console.log('Using sample input!');
  console.log('Retrieving asset movements...');
  const movements = await getTokenMovements(hasOptions ? input : sampleInput);
  await displayTokenMovements(movements);
  const assetBalances = await computeAssetBalances(movements);
  console.log('Computing asset balances...');
  console.table(assetBalances);
}

main();
