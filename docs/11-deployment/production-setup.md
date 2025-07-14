---
id: production-setup
title: Production Setup
sidebar_position: 2
description: Complete guide to deploying Baileys applications in production environments.
keywords: [baileys, production, deployment, server, hosting, pm2, docker, security]
---

# Production Setup

This guide covers everything you need to know to deploy your Baileys application in a production environment safely and efficiently.

## Environment Preparation

### System Requirements

**Minimum Requirements:**
- Node.js 20.0.0 or higher
- 2GB RAM
- 10GB disk space
- Stable internet connection

**Recommended Requirements:**
- Node.js 20+ (latest LTS)
- 4GB+ RAM
- 50GB+ SSD storage
- High-speed internet (100+ Mbps)
- Linux server (Ubuntu 20.04+ or CentOS 8+)

### Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools for native dependencies
sudo apt-get install -y build-essential python3 python3-pip

# Install PM2 for process management
sudo npm install -g pm2

# Install additional dependencies
sudo apt-get install -y git curl wget unzip
```

## Application Configuration

### Environment Variables

Create a `.env` file for production configuration:

```bash
# .env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/baileys_db

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/baileys/app.log

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key

# WhatsApp
WA_SESSION_PATH=/var/lib/baileys/sessions
WA_MEDIA_PATH=/var/lib/baileys/media

# Monitoring
HEALTH_CHECK_PORT=3001
METRICS_PORT=3002

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# External Services
WEBHOOK_URL=https://your-domain.com/webhook
API_BASE_URL=https://api.your-domain.com
```

### Production Configuration

```typescript
// config/production.ts
export const productionConfig = {
    server: {
        port: process.env.PORT || 3000,
        host: '0.0.0.0',
        keepAliveTimeout: 65000,
        headersTimeout: 66000
    },
    
    whatsapp: {
        sessionPath: process.env.WA_SESSION_PATH || './sessions',
        mediaPath: process.env.WA_MEDIA_PATH || './media',
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 2000,
        maxMsgRetryCount: 5,
        printQRInTerminal: false,
        syncFullHistory: false
    },
    
    database: {
        url: process.env.DATABASE_URL,
        ssl: true,
        pool: {
            min: 2,
            max: 10,
            acquireTimeoutMillis: 30000,
            idleTimeoutMillis: 600000
        }
    },
    
    redis: {
        url: process.env.REDIS_URL,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE,
        maxFiles: 10,
        maxSize: '10m',
        format: 'json'
    },
    
    security: {
        jwtSecret: process.env.JWT_SECRET,
        encryptionKey: process.env.ENCRYPTION_KEY,
        rateLimiting: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
        }
    },
    
    monitoring: {
        healthCheckPort: process.env.HEALTH_CHECK_PORT || 3001,
        metricsPort: process.env.METRICS_PORT || 3002,
        enableMetrics: true,
        enableHealthCheck: true
    }
}
```

## Security Hardening

### Application Security

```typescript
// security/middleware.ts
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'

export const securityMiddleware = [
    // Security headers
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"]
            }
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }),
    
    // Compression
    compression(),
    
    // Rate limiting
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP',
        standardHeaders: true,
        legacyHeaders: false
    })
]
```

### Session Security

```typescript
// security/session.ts
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export class SecureSessionManager {
    private encryptionKey: Buffer
    
    constructor(encryptionKey: string) {
        this.encryptionKey = Buffer.from(encryptionKey, 'hex')
    }
    
    encryptSession(sessionData: any): string {
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey)
        
        let encrypted = cipher.update(JSON.stringify(sessionData), 'utf8', 'hex')
        encrypted += cipher.final('hex')
        
        return iv.toString('hex') + ':' + encrypted
    }
    
    decryptSession(encryptedData: string): any {
        const [ivHex, encrypted] = encryptedData.split(':')
        const iv = Buffer.from(ivHex, 'hex')
        const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey)
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        
        return JSON.parse(decrypted)
    }
    
    saveSecureSession(sessionId: string, sessionData: any) {
        const encrypted = this.encryptSession(sessionData)
        const sessionPath = path.join(process.env.WA_SESSION_PATH, `${sessionId}.enc`)
        
        fs.writeFileSync(sessionPath, encrypted, { mode: 0o600 })
    }
    
    loadSecureSession(sessionId: string): any {
        const sessionPath = path.join(process.env.WA_SESSION_PATH, `${sessionId}.enc`)
        
        if (!fs.existsSync(sessionPath)) {
            return null
        }
        
        const encrypted = fs.readFileSync(sessionPath, 'utf8')
        return this.decryptSession(encrypted)
    }
}
```

### Firewall Configuration

```bash
# UFW (Ubuntu Firewall) setup
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if using non-standard)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow your application port
sudo ufw allow 3000/tcp

# Allow monitoring ports (restrict to specific IPs if needed)
sudo ufw allow from YOUR_MONITORING_IP to any port 3001
sudo ufw allow from YOUR_MONITORING_IP to any port 3002

# Check status
sudo ufw status verbose
```

## Process Management

### PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
    apps: [{
        name: 'baileys-bot',
        script: './dist/index.js',
        instances: 1, // Don't use cluster mode for WhatsApp bots
        exec_mode: 'fork',
        
        // Environment
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        
        // Logging
        log_file: '/var/log/baileys/combined.log',
        out_file: '/var/log/baileys/out.log',
        error_file: '/var/log/baileys/error.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        
        // Restart policy
        restart_delay: 5000,
        max_restarts: 10,
        min_uptime: '10s',
        
        // Memory management
        max_memory_restart: '1G',
        
        // Monitoring
        monitoring: true,
        pmx: true,
        
        // Auto-restart on file changes (disable in production)
        watch: false,
        
        // Node.js options
        node_args: [
            '--max-old-space-size=2048',
            '--optimize-for-size'
        ]
    }]
}
```

### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js

# Monitor processes
pm2 monit

# View logs
pm2 logs baileys-bot

# Restart application
pm2 restart baileys-bot

# Stop application
pm2 stop baileys-bot

# Delete application
pm2 delete baileys-bot

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

## Database Setup

### PostgreSQL Configuration

```sql
-- Create database and user
CREATE DATABASE baileys_db;
CREATE USER baileys_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE baileys_db TO baileys_user;

-- Connect to database
\c baileys_db;

-- Create tables
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id VARCHAR(255) PRIMARY KEY,
    chat_id VARCHAR(255) NOT NULL,
    sender_id VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chats (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_sessions_updated_at ON sessions(updated_at);

-- Set up permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO baileys_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO baileys_user;
```

### Redis Configuration

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Key settings:
# bind 127.0.0.1
# port 6379
# requirepass your_redis_password
# maxmemory 256mb
# maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

## Logging and Monitoring

### Structured Logging

```typescript
// logging/logger.ts
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
)

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'baileys-bot' },
    transports: [
        // Console logging (for development)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        
        // File logging with rotation
        new DailyRotateFile({
            filename: '/var/log/baileys/app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true
        }),
        
        // Error logging
        new DailyRotateFile({
            filename: '/var/log/baileys/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '30d',
            zippedArchive: true
        })
    ]
})
```

### Health Checks

```typescript
// monitoring/health.ts
import express from 'express'
import { logger } from '../logging/logger'

const healthApp = express()

healthApp.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version
    }
    
    try {
        // Check database connection
        // await checkDatabase()
        
        // Check Redis connection
        // await checkRedis()
        
        // Check WhatsApp connection
        // const waStatus = await checkWhatsAppConnection()
        // health.whatsapp = waStatus
        
        res.status(200).json(health)
    } catch (error) {
        logger.error('Health check failed', error)
        res.status(503).json({
            ...health,
            status: 'error',
            error: error.message
        })
    }
})

healthApp.get('/ready', async (req, res) => {
    // Readiness probe - check if app is ready to serve traffic
    try {
        // Perform readiness checks
        res.status(200).json({ status: 'ready' })
    } catch (error) {
        res.status(503).json({ status: 'not ready', error: error.message })
    }
})

export const startHealthServer = (port: number) => {
    healthApp.listen(port, () => {
        logger.info(`Health check server running on port ${port}`)
    })
}
```

## SSL/TLS Configuration

### Let's Encrypt with Nginx

```bash
# Install Nginx
sudo apt install nginx

# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Nginx configuration
sudo nano /etc/nginx/sites-available/baileys-bot
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /health {
        proxy_pass http://localhost:3001;
        access_log off;
    }
}
```

## Backup Strategy

### Automated Backups

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/baileys"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U baileys_user baileys_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup sessions
tar -czf $BACKUP_DIR/sessions_$DATE.tar.gz -C /var/lib/baileys sessions/

# Backup media files
tar -czf $BACKUP_DIR/media_$DATE.tar.gz -C /var/lib/baileys media/

# Backup configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz -C /opt/baileys-bot .env ecosystem.config.js

# Remove old backups
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
```

```bash
# Add to crontab
crontab -e

# Run backup daily at 2 AM
0 2 * * * /opt/baileys-bot/scripts/backup.sh >> /var/log/baileys/backup.log 2>&1
```

## Deployment Checklist

### Pre-deployment

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup complete
- [ ] Load testing performed

### Deployment

- [ ] Application built and tested
- [ ] Dependencies installed
- [ ] PM2 configuration deployed
- [ ] Nginx configuration updated
- [ ] Health checks passing
- [ ] Logs monitoring active

### Post-deployment

- [ ] Application responding correctly
- [ ] WhatsApp connection established
- [ ] Database connections working
- [ ] SSL certificate valid
- [ ] Monitoring alerts configured
- [ ] Backup verification complete

---

**Next Steps:**
- [Scaling](./scaling.md) - Scale your application
- [Monitoring](./monitoring.md) - Advanced monitoring setup
