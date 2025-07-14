function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // If the URI doesn't have a file extension, it's likely a SPA route
    if (!uri.includes('.') && !uri.endsWith('/')) {
        // Redirect to index.html for SPA routing
        request.uri = '/index.html';
    }
    
    // If the URI is just '/', serve index.html
    if (uri === '/') {
        request.uri = '/index.html';
    }
    
    // Add security headers
    if (!request.headers['x-origin-verify']) {
        return {
            statusCode: 403,
            statusDescription: 'Forbidden',
            body: 'Direct access not allowed'
        };
    }
    
    return request;
}