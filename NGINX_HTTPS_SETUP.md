# Nginx HTTPS Reverse Proxy Setup Guide

This document explains the nginx reverse proxy setup with HTTPS support and all necessary application changes.

## Overview

An nginx container has been configured as a reverse proxy that:
- Terminates SSL/TLS connections (HTTPS)
- Redirects all HTTP traffic to HTTPS
- Routes frontend requests to Next.js (port 3000)
- Routes backend API requests to FastAPI (port 8000) under `/api/` path
- Adds security headers and compression

## Files Created

### Nginx Configuration
- `nginx/Dockerfile` - Nginx container definition
- `nginx/nginx.conf` - Main nginx configuration with HTTPS, SSL, and routing
- `nginx/ssl/README.md` - SSL certificate setup instructions (Let's Encrypt & self-signed)
- `nginx/README.md` - Nginx setup and troubleshooting guide
- `.gitignore` - Added SSL certificate exclusions

### Backend Changes
- `backend/app/config.py` - Added `CORS_ORIGINS` and `TRUSTED_PROXIES` configuration
- `backend/app/main.py` - Updated CORS to use environment-based origins, added proxy header handling

### Docker Configuration
- `docker-compose.yml` - Added nginx service, removed direct port mappings

## Required Setup Steps

### 1. Generate SSL Certificates

**For Development (Self-Signed):**
```bash
cd nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
chmod 600 key.pem
chmod 644 cert.pem
```

**For Production (Let's Encrypt):**
See `nginx/ssl/README.md` for detailed instructions.

### 2. Update Environment Variables

Add to `backend/.env`:

```env
# CORS Configuration
# For production, specify your domain(s):
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# For development, you can use:
# CORS_ORIGINS=*

# Trusted proxies (use '*' when behind nginx)
TRUSTED_PROXIES=*
```

### 3. Update Frontend API Base URL

Your frontend needs to be configured to use `/api/` as the base URL for API requests.

**Example for Next.js:**
```typescript
// In your API client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
```

**Example for environment variable:**
```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

### 4. Start Services

```bash
docker-compose up -d
```

### 5. Verify Setup

- **Frontend**: `https://localhost` or `https://yourdomain.com`
- **Backend API**: `https://localhost/api/` or `https://yourdomain.com/api/`

## Routing Configuration

### Current Routing
- **Frontend** (`/`): → `http://frontend:3000`
- **Backend API** (`/api/`): → `http://backend:8000/`

**Important**: The nginx configuration strips the `/api/` prefix when forwarding to the backend. So:
- Request: `https://domain.com/api/companies/...`
- Forwarded to: `http://backend:8000/companies/...`

This means your backend routes remain unchanged, but the frontend must use `/api/` prefix.

## Application Changes Summary

### Backend Changes

1. **CORS Configuration** (`backend/app/main.py`):
   - Changed from hardcoded `["*"]` to environment-based `CORS_ORIGINS`
   - Supports comma-separated list of allowed origins
   - Defaults to `"*"` for development

2. **Proxy Headers** (`backend/app/main.py`):
   - FastAPI/Starlette automatically handles `X-Forwarded-*` headers
   - Configuration ready for trusted proxy setup

3. **Configuration** (`backend/app/config.py`):
   - Added `CORS_ORIGINS` setting (default: `"*"`)
   - Added `TRUSTED_PROXIES` setting (default: `"*"`)

### Frontend Changes Required

1. **API Base URL**: Update your frontend to use `/api/` as the base URL for all API requests
2. **HTTPS**: Ensure all API calls use HTTPS (or relative URLs starting with `/api/`)
3. **CORS**: If using specific domains, ensure your frontend domain is in `CORS_ORIGINS`

## Security Considerations

### Production Checklist

- [ ] Use Let's Encrypt certificates (not self-signed)
- [ ] Set `CORS_ORIGINS` to specific domain(s), not `"*"`
- [ ] Remove or secure direct port mappings in docker-compose.yml
- [ ] Set up certificate auto-renewal
- [ ] Monitor SSL certificate expiration
- [ ] Review and adjust security headers in nginx.conf if needed
- [ ] Ensure `TRUSTED_PROXIES` is properly configured

### Development

- Self-signed certificates are acceptable (browser warnings expected)
- `CORS_ORIGINS=*` is acceptable for local development
- Direct port mappings can be uncommented for debugging

## Troubleshooting

### SSL Certificate Errors
- Ensure `cert.pem` and `key.pem` exist in `nginx/ssl/`
- Check file permissions: `chmod 644 cert.pem` and `chmod 600 key.pem`
- Verify certificate: `openssl x509 -in nginx/ssl/cert.pem -text -noout`

### CORS Errors
- Check `CORS_ORIGINS` in `backend/.env`
- Ensure frontend domain is included in allowed origins
- Verify nginx is passing correct `Origin` header

### 502 Bad Gateway
- Check if services are running: `docker-compose ps`
- Review logs: `docker-compose logs nginx backend frontend`
- Verify network connectivity between containers

### API Not Found (404)
- Ensure frontend uses `/api/` prefix for API calls
- Check nginx routing configuration
- Verify backend routes are correct

## Testing

### Test HTTP to HTTPS Redirect
```bash
curl -I http://localhost
# Should return 301 redirect to https://
```

### Test Frontend
```bash
curl -k https://localhost
# Should return frontend HTML
```

### Test Backend API
```bash
curl -k https://localhost/api/companies/
# Should return API response
```

### Test SSL Certificate
```bash
openssl s_client -connect localhost:443 -servername localhost
# Check certificate details
```

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## Support

For issues or questions:
1. Check `nginx/README.md` for nginx-specific issues
2. Check `nginx/ssl/README.md` for SSL certificate issues
3. Review docker-compose logs: `docker-compose logs`

