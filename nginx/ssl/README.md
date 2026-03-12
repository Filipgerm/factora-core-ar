# SSL Certificate Setup

This directory should contain your SSL certificates for HTTPS support.

## Option A: Let's Encrypt (Production)

For production environments, use Let's Encrypt certificates with automatic renewal.

### Using Certbot (Recommended)

1. Install certbot on your host machine:
   ```bash
   sudo apt-get update
   sudo apt-get install certbot
   ```

2. Obtain certificates (replace `yourdomain.com` with your actual domain):
   ```bash
   sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
   ```

3. Copy certificates to this directory:
   ```bash
   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
   ```

4. Set proper permissions:
   ```bash
   sudo chmod 644 nginx/ssl/cert.pem
   sudo chmod 600 nginx/ssl/key.pem
   ```

5. For automatic renewal, add a cron job:
   ```bash
   sudo crontab -e
   ```
   Add this line (runs renewal check twice daily):
   ```
   0 0,12 * * * certbot renew --quiet && docker-compose restart nginx
   ```

### Using Docker Certbot Container

Alternatively, you can use a certbot container in your docker-compose.yml:

```yaml
certbot:
  image: certbot/certbot
  volumes:
    - ./nginx/ssl:/etc/letsencrypt
    - ./nginx/certbot:/var/www/certbot
  command: certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d yourdomain.com
```

## Option B: Self-Signed Certificate (Development)

For development/testing purposes, you can generate a self-signed certificate.

### Generate Self-Signed Certificate

Run this command in the `nginx/ssl/` directory:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

**Note:** Browsers will show a security warning for self-signed certificates. This is expected and safe for development.

### Quick Setup Script

You can use this script to generate a self-signed certificate:

```bash
#!/bin/bash
cd nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
chmod 600 key.pem
chmod 644 cert.pem
echo "Self-signed certificate generated successfully!"
```

## File Structure

After setup, your `nginx/ssl/` directory should contain:

```
nginx/ssl/
├── cert.pem    # SSL certificate (public key)
├── key.pem     # SSL private key
└── README.md   # This file
```

## Important Notes

1. **Never commit private keys to version control** - Add `key.pem` to `.gitignore`
2. **Keep certificates secure** - Use proper file permissions (600 for keys, 644 for certs)
3. **Certificate expiration** - Let's Encrypt certificates expire every 90 days, ensure renewal is set up
4. **Domain validation** - For Let's Encrypt, your domain must point to your server's IP address

## Troubleshooting

- **Certificate not found**: Ensure `cert.pem` and `key.pem` exist in `nginx/ssl/`
- **Permission denied**: Check file permissions with `ls -la nginx/ssl/`
- **SSL handshake failed**: Verify certificate and key match using `openssl x509 -noout -modulus -in cert.pem | openssl md5` and `openssl rsa -noout -modulus -in key.pem | openssl md5` (should match)

