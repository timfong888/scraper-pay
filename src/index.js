addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request))
  })
  
  async function handleRequest(request) {
	return new Response(JSON.stringify({
	  message: "Hello",
	  headers: Object.fromEntries(request.headers),
	  timestamp: new Date().toISOString()
	}), {
	  headers: { 'Content-Type': 'application/json' }
	})
  }

/* https://claude.ai/chat/f9a7fe19-3940-4726-9dd1-50fc126b775c */

