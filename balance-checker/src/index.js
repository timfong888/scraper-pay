async function checkUSDCBalance(walletAddress, rpcUrl) {
	const USDC_CONTRACT = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
  
	const data = `0x70a08231000000000000000000000000${walletAddress.slice(2).toLowerCase()}`;
  
	try {
	  console.log('Checking balance for wallet:', walletAddress);
	  
	  const response = await fetch(rpcUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
		  jsonrpc: '2.0',
		  id: 1,
		  method: 'eth_call',
		  params: [{
			to: USDC_CONTRACT,
			data: data
		  }, 'latest']
		})
	  });
  
	  const result = await response.json();
	  console.log('Raw RPC response:', result);
  
	  if (result.error) {
		throw new Error(`RPC error: ${JSON.stringify(result.error)}`);
	  }
  
	  // Convert hex to decimal string first to preserve precision
	  const rawBalance = BigInt(result.result).toString();
	  console.log('Raw balance (wei):', rawBalance);
  
	  // Convert to USDC with 6 decimals
	  const balance = Number(rawBalance) / 1_000_000;
	  console.log('Converted balance (USDC):', balance);
  
	  return balance;
	} catch (error) {
	  console.error('Balance check error:', error);
	  throw error;
	}
  }
  
  export default {
	async fetch(request, env) {
	  const walletAddress = request.headers.get('X-Wallet-Address');
  
	  if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
		return new Response(JSON.stringify({
		  error: 'Invalid or missing wallet address'
		}), {
		  status: 400,
		  headers: { 'Content-Type': 'application/json' }
		});
	  }
  
	  try {
		const balance = await checkUSDCBalance(walletAddress, env.RPC_URL);
		return new Response(JSON.stringify({ 
		  balance,
		  formatted: balance.toFixed(6) // Ensure we show all decimal places
		}), {
		  status: 200,
		  headers: { 'Content-Type': 'application/json' }
		});
	  } catch (error) {
		return new Response(JSON.stringify({
		  error: 'Failed to check balance',
		  details: error.message
		}), {
		  status: 500,
		  headers: { 'Content-Type': 'application/json' }
		});
	  }
	}
  };