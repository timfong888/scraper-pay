// wallet-creator/src/index.js
async function createManagedWallet(domain, env) {
	try {
	  const timestamp = Math.floor(Date.now() / 1000).toString();
	  const method = 'POST';
	  const requestPath = '/v2/wallets';

		// Create request body BEFORE using it
		const requestBody = {
		name: `${domain}-${Date.now()}`,
		chain: "optimism",
		type: "managed"
		};
	  
	  const message = timestamp + method + requestPath;
	  const signature = await createHmacSignature(message, env.COINBASE_SECRET_KEY);

	  console.log('Making Coinbase request:', {
		url: 'https://api.coinbase.com' + requestPath,
		timestamp,
		hasApiKey: !!env.COINBASE_API_KEY,
		hasSecretKey: !!env.COINBASE_SECRET_KEY,
		body: requestBody
	  });

	  console.log('Request body:', requestBody);
  
	  const response = await fetch('https://api.coinbase.com' + requestPath, {
		method: 'POST',
		headers: {
		  'CB-ACCESS-KEY': env.COINBASE_API_KEY,
		  'CB-ACCESS-SIGN': signature,
		  'CB-ACCESS-TIMESTAMP': timestamp,
		  'CB-VERSION': '2024-01-01',
		  'Content-Type': 'application/json'
		},
		body: JSON.stringify({
		  name: `${domain}-${Date.now()}`,
		  chain: "optimism",
		  type: "managed"
		})
	  });

	  console.log('Coinbase response status:', response.status);
    
	  const data = await response.json();
	  console.log('Wallet creation response:', data);
  
	  return {
		domain,
		walletId: data.data.id,
		address: data.data.address,
		chain: data.data.chain,
		createdAt: new Date().toISOString()
	  };
	} catch (error) {
	  console.error('Wallet creation error:', error);
	  throw error;
	}
  }
  
  async function createHmacSignature(message, secret) {
	const encoder = new TextEncoder();
	const key = encoder.encode(secret);
	const data = encoder.encode(message);
	
	const cryptoKey = await crypto.subtle.importKey(
	  'raw', key,
	  { name: 'HMAC', hash: 'SHA-256' },
	  false, ['sign']
	);
	
	const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
	
	return Array.from(new Uint8Array(signature))
	  .map(b => b.toString(16).padStart(2, '0'))
	  .join('');
  }
  
  export default {
	async fetch(request, env) {
	  if (request.method === 'POST') {
		try {
		  const { domain } = await request.json();
		  
		  if (!domain) {
			return new Response(JSON.stringify({
			  error: 'Domain is required'
			}), { status: 400 });
		  }
  
		  // Check if wallet exists
		  const existing = await env.WALLET_DATA.get(`domain:${domain}`);
		  if (existing) {
			return new Response(JSON.stringify({
			  error: 'Domain already has a wallet',
			  wallet: JSON.parse(existing)
			}), { status: 409 });
		  }
  
		  const wallet = await createManagedWallet(domain, env);
		  await env.WALLET_DATA.put(`domain:${domain}`, JSON.stringify(wallet));
		  
		  return new Response(JSON.stringify({
			success: true,
			wallet,
			dnsSetup: {
			  record: 'TXT',
			  name: '_wallet',
			  value: `wallet=${wallet.address}`
			}
		  }), {
			headers: { 'Content-Type': 'application/json' }
		  });
  
		} catch (error) {
		  return new Response(JSON.stringify({
			error: 'Wallet creation failed',
			details: error.message
		  }), { status: 500 });
		}
	  }
  
	  if (request.method === 'GET') {
		const url = new URL(request.url);
		const domain = url.searchParams.get('domain');
		
		if (!domain) {
		  return new Response(JSON.stringify({
			error: 'Domain parameter required'
		  }), { status: 400 });
		}
  
		const walletData = await env.WALLET_DATA.get(`domain:${domain}`);
		if (!walletData) {
		  return new Response(JSON.stringify({
			error: 'No wallet found for domain'
		  }), { status: 404 });
		}
  
		return new Response(walletData, {
		  headers: { 'Content-Type': 'application/json' }
		});
	  }
  
	  return new Response(JSON.stringify({
		message: 'Send POST with domain to create wallet or GET to lookup'
	  }));
	}
  }

