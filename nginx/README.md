# Nginx Reverse Proxy Setup

This directory contains the nginx reverse proxy configuration for handling HTTPS termination and routing requests to the frontend and backend services.

## Overview

The nginx container acts as a reverse proxy that:
- Terminates SSL/TLS connections (HTTPS)
- Redirects HTTP traffic to HTTPS
- Routes frontend requests to the Next.js service (port 3000)
- Routes backend API requests to the FastAPI service (port 8000)
- Adds security headers
- Handles compression (gzip)

## Directory Structure

```
nginx/
├── Dockerfile          # Nginx container definition.
├── nginx.conf          # Main nginx configuration
├── ssl/                # SSL certificates directory
│   ├── cert.pem        # SSL certificate (public key)
│   ├── key.pem         # SSL private key
│   └── README.md       # SSL certificate setup instructions
└── README.md           # This file
```

## Quick Start

### 1. Generate SSL Certificates

For development, generate a self-signed certificate:

```bash
cd nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

For production, see [ssl/README.md](ssl/README.md) for Let's Encrypt setup.

### 2. Start Services

```bash
docker-compose up -d
```

### 3. Access Your Application

- **Frontend**: `https://localhost` or `https://yourdomain.com`
- **Backend API**: `https://localhost/api/` or `https://yourdomain.com/api/`

## Configuration

### Routing

- **Frontend** (`/`): Proxied to `http://frontend:3000`
- **Backend API** (`/api/`): Proxied to `http://backend:8000/`

Note: The backend API is accessible under `/api/` path. Make sure your frontend is configured to use `/api/` as the API base URL.

### SSL Configuration

SSL certificates should be placed in `nginx/ssl/`:
- `cert.pem` - SSL certificate
- `key.pem` - SSL private key

See [ssl/README.md](ssl/README.md) for detailed SSL setup instructions.

### Environment Variables

Update your `.env` file with the following variables for proper CORS configuration:

```env
# CORS Configuration
# For production, specify your domain(s):
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# For development, you can use:
CORS_ORIGINS=*

# Trusted proxies (use '*' when behind nginx)
TRUSTED_PROXIES=*
```

## Security Features

The nginx configuration includes:

- **HTTP to HTTPS redirect**: All HTTP traffic is automatically redirected to HTTPS
- **Strong SSL/TLS configuration**: TLS 1.2+ with secure cipher suites
- **Security headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, etc.
- **HSTS**: Strict Transport Security header for HTTPS
- **Gzip compression**: Reduces bandwidth usage

## Troubleshooting

### Certificate Errors

If you see SSL certificate errors:
1. Ensure `cert.pem` and `key.pem` exist in `nginx/ssl/`
2. Check file permissions: `chmod 644 cert.pem` and `chmod 600 key.pem`
3. Verify certificate validity: `openssl x509 -in cert.pem -text -noout`

### Connection Refused

If nginx can't connect to backend/frontend:
1. Ensure all services are running: `docker-compose ps`
2. Check service logs: `docker-compose logs nginx`
3. Verify network connectivity: Services must be on the same Docker network

### CORS Errors

If you encounter CORS errors:
1. Check `CORS_ORIGINS` environment variable in backend `.env`
2. Ensure your frontend domain is included in the allowed origins
3. Verify nginx is passing the correct `Origin` header

### 502 Bad Gateway

If you see 502 errors:
1. Check if backend/frontend services are running
2. Review service logs: `docker-compose logs backend` or `docker-compose logs frontend`
3. Verify service health endpoints are accessible

## Development vs Production

### Development

- Use self-signed certificates (browser warnings expected)
- Keep direct port mappings commented out in docker-compose.yml
- Access services through nginx on ports 80/443

### Production

- Use Let's Encrypt certificates (see [ssl/README.md](ssl/README.md))
- Remove or secure direct port mappings
- Configure proper domain names in CORS_ORIGINS
- Set up certificate auto-renewal
- Monitor SSL certificate expiration

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

