// usage-tracker/src/index.js
async function trackUsage(walletAddress, bytes, env) {
	const usageKey = `usage:${walletAddress}`;
	let currentUsage = await env.USAGE_DATA.get(usageKey);
	currentUsage = currentUsage ? parseInt(currentUsage) : 0;
	
	const newUsage = currentUsage + bytes;
	await env.USAGE_DATA.put(usageKey, newUsage.toString());
	
	const costInUSDC = bytes / (1024 * 1024);
	return { totalBytes: newUsage, costInUSDC };
  }
  
  export default {
	async fetch(request, env) {
	  console.log("Request received:", {
		method: request.method,
		url: request.url,
		headers: Object.fromEntries(request.headers)
	  });
  
	  const walletAddress = request.headers.get('X-Wallet-Address');
	  const contentLength = parseInt(request.headers.get('Content-Length') || '0');
  
	  if (request.method === 'POST') {
		if (!walletAddress || !contentLength) {
		  return new Response(JSON.stringify({
			error: 'Missing wallet address or content length'
		  }), { status: 400 });
		}
  
		try {
		  const usage = await trackUsage(walletAddress, contentLength, env);
		  return new Response(JSON.stringify({
			tracked: true,
			usage
		  }), { status: 200 });
		} catch (error) {
		  return new Response(JSON.stringify({
			error: 'Failed to track usage'
		  }), { status: 500 });
		}
	  } else {
		return new Response(JSON.stringify({
		  message: "Worker is running",
		  instructions: "Use POST method to track usage"
		}));
	  }
	}
  }