async function checkUSDCBalance(walletAddress, env, chain = 'base') {
	try {
	  const timestamp = Math.floor(Date.now() / 1000).toString();
	  const method = 'GET';
	  const requestPath = `/v2/accounts/${walletAddress}/balances/${chain}/usdc`;
	  
	  const message = timestamp + method + requestPath;
	  const signature = await createHmacSignature(message, env.COINBASE_SECRET_KEY);
  
	  const response = await fetch(`https://api.coinbase.com${requestPath}`, {
		headers: {
		  'CB-ACCESS-KEY': env.COINBASE_API_KEY,
		  'CB-ACCESS-SIGN': signature,
		  'CB-ACCESS-TIMESTAMP': timestamp,
		  'CB-VERSION': '2024-01-01'
		}
	  });
	  
	  const data = await response.json();
	  console.log('Coinbase response for chain:', chain, data);
	  return parseFloat(data.data.balance.amount);
	} catch (error) {
	  console.error('Balance check error:', error);
	  return 0;
	}
  }

  async function createManagedWallet(env, agentId) {
	try {
	  const timestamp = Math.floor(Date.now() / 1000).toString();
	  const method = 'POST';
	  const requestPath = '/v2/wallets';
	  
	  // Log initial request details
	  console.log('Starting wallet creation:', {
		timestamp,
		method,
		requestPath,
		agentId,
		hasApiKey: !!env.COINBASE_API_KEY,
		hasApiSecret: !!env.COINBASE_API_SECRET
	  });
  
	  const message = timestamp + method + requestPath;
	  const signature = await createHmacSignature(message, env.COINBASE_SECRET_KEY);
  
	  const requestBody = {
		name: `Agent-${agentId}-Wallet`,
		chain: "base",
		type: "managed"
	  };
  
	  // Log request body
	  console.log('Wallet creation request:', {
		body: requestBody,
		hasSignature: !!signature
	  });
  
	  const response = await fetch('https://api.coinbase.com' + requestPath, {
		method: 'POST',
		headers: {
		  'CB-ACCESS-KEY': env.COINBASE_API_KEY,
		  'CB-ACCESS-SIGN': signature,
		  'CB-ACCESS-TIMESTAMP': timestamp,
		  'CB-VERSION': '2024-01-01',
		  'Content-Type': 'application/json'
		},
		body: JSON.stringify(requestBody)
	  });
  
	  // Log response status
	  console.log('Coinbase API response status:', response.status);
  
	  const data = await response.json();
	  console.log('Wallet creation response:', data);
	  
	  if (data.errors) {
		console.error('Wallet creation errors:', data.errors);
		throw new Error(data.errors[0].message);
	  }
	  
	  // Log successful creation
	  console.log('Wallet created successfully:', {
		agentId,
		walletId: data.data?.id,
		chain: data.data?.chain
	  });
  
	  return data.data;
	} catch (error) {
	  console.error('Wallet creation error:', {
		error: error.message,
		stack: error.stack,
		agentId
	  });
	  throw error;
	}
  }
  
  // Modified to not use Buffer
  async function createHmacSignature(message, secret) {
	const encoder = new TextEncoder();
	const key = encoder.encode(secret);
	const data = encoder.encode(message);
	const cryptoKey = await crypto.subtle.importKey(
	  'raw', key, { name: 'HMAC', hash: 'SHA-256' }, 
	  false, ['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
	
	// Convert to hex without using Buffer
	return Array.from(new Uint8Array(signature))
	  .map(b => b.toString(16).padStart(2, '0'))
	  .join('');
  }
  
  async function handleRequest(request, env) {  // Added env parameter
	const walletAddress = request.headers.get('X-Wallet-Address');
	const chain = request.headers.get('X-Chain') || 'base';

	if (request.url.endsWith('/create-wallet')) {
		const wallet = await createManagedWallet(env);
		return new Response(JSON.stringify({
		  message: "Wallet created",
		  wallet: wallet
		}), {
		  status: 200,
		  headers: { 'Content-Type': 'application/json' }
		});
	  }
  
	console.log('Request details:', {
	  wallet: walletAddress,
	  envVarsPresent: {
		COINBASE_API_KEY: !!env.COINBASE_API_KEY,
		COINBASE_SECRET_KEY: !!env.COINBASE_SECRET_KEY
	  }
	});
  
	if (!walletAddress) {
	  return createErrorResponse('Missing wallet address', 400);
	}
  
	const balance = await checkUSDCBalance(walletAddress, env, chain);  // Added env parameter
	if (balance <= 0) {
	  return createErrorResponse('Insufficient USDC balance', 403);
	}
  
	return new Response(JSON.stringify({
	  message: "Valid request",
	  wallet: walletAddress,
	  balance: {
		amount: balance,
		currency: "USDC",
		chain: chain
	  },
	  status: "authorized",
	  headers: Object.fromEntries(request.headers),
	  timestamp: new Date().toISOString()
	}), {
	  status: 200,
	  headers: { 'Content-Type': 'application/json' }
	});
  }
  
  function createErrorResponse(message, status) {
	return new Response(JSON.stringify({
	  error: message,
	  timestamp: new Date().toISOString()
	}), { 
	  status: status,
	  headers: { 'Content-Type': 'application/json' }
	});
  }
  
  export default {
	async fetch(request, env, ctx) {
		// Log the entire env object structure
		console.log('Environment debug:', {
			envExists: !!env,
			availableKeys: env ? Object.keys(env) : [],
		});	
	  return await handleRequest(request, env);  // Passing env
	}
  };

/* October 20, 2024  
/* https://claude.ai/chat/f9a7fe19-3940-4726-9dd1-50fc126b775c */

/* October 24, 2024
/* 

