# Deployment Guide

This guide covers deploying Baileys applications to production environments, including cloud platforms, containerization, and best practices for scaling.

## Production Readiness Checklist

Before deploying to production, ensure your application meets these requirements:

### ✅ Code Quality
- [ ] TypeScript compilation without errors
- [ ] Comprehensive error handling
- [ ] Proper logging implementation
- [ ] Unit tests coverage > 80%
- [ ] Code linting and formatting

### ✅ Security
- [ ] Environment variables for sensitive data
- [ ] Secure session storage
- [ ] Input validation and sanitization
- [ ] Rate limiting implementation
- [ ] HTTPS/WSS connections

### ✅ Performance
- [ ] Memory leak prevention
- [ ] Database connection pooling
- [ ] Caching strategy implemented
- [ ] Message queuing for high volume
- [ ] Resource monitoring

### ✅ Reliability
- [ ] Graceful shutdown handling
- [ ] Auto-reconnection logic
- [ ] Health check endpoints
- [ ] Backup and recovery procedures
- [ ] Monitoring and alerting

## Environment Setup

### Environment Variables

Create a comprehensive `.env` file:

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# WhatsApp Configuration
PHONE_NUMBER=+1234567890
BOT_NAME=Production Bot
DEFAULT_PREFIX=!

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/baileys_db
REDIS_URL=redis://localhost:6379

# Storage
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET=baileys-sessions

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
WEBHOOK_URL=https://your-webhook-url

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
```

### Production Configuration

```typescript
// config/production.ts
export const productionConfig = {
    // Connection settings
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    defaultQueryTimeoutMs: 60000,
    
    // Performance
    maxConcurrentMessages: 10,
    messageQueueSize: 1000,
    cacheSize: 10000,
    
    // Reliability
    maxReconnectAttempts: 10,
    reconnectBackoffMs: 5000,
    healthCheckIntervalMs: 30000,
    
    // Security
    enableRateLimiting: true,
    maxMessagesPerMinute: 60,
    enableInputValidation: true,
    
    // Monitoring
    enableMetrics: true,
    enableTracing: true,
    logLevel: 'info'
}
```

## Cloud Platform Deployment

### AWS Deployment

#### 1. EC2 Instance Setup

```bash
# Launch EC2 instance (Ubuntu 22.04 LTS)
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone your repository
git clone https://github.com/your-username/your-bot.git
cd your-bot

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 2. PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
    apps: [{
        name: 'whatsapp-bot',
        script: 'dist/index.js',
        instances: 1, // Single instance for WhatsApp connection
        exec_mode: 'fork',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true,
        max_memory_restart: '1G',
        restart_delay: 5000,
        max_restarts: 10,
        min_uptime: '10s'
    }]
}
```

#### 3. RDS Database Setup

```sql
-- Create database and tables
CREATE DATABASE baileys_production;

-- Auth credentials table
CREATE TABLE auth_creds (
    user_id VARCHAR(255) PRIMARY KEY,
    creds_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signal keys table
CREATE TABLE signal_keys (
    user_id VARCHAR(255) NOT NULL,
    key_type VARCHAR(50) NOT NULL,
    key_id VARCHAR(255) NOT NULL,
    key_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, key_type, key_id)
);

-- Messages table (optional)
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    jid VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    content TEXT,
    message_type VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_jid_timestamp (jid, timestamp)
);
```

### Google Cloud Platform

#### 1. Cloud Run Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S baileys -u 1001

# Change ownership
RUN chown -R baileys:nodejs /app
USER baileys

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start application
CMD ["npm", "start"]
```

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/whatsapp-bot', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/whatsapp-bot']
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'whatsapp-bot'
      - '--image'
      - 'gcr.io/$PROJECT_ID/whatsapp-bot'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
```

### Azure Container Instances

```yaml
# azure-container-instance.yaml
apiVersion: 2019-12-01
location: eastus
name: whatsapp-bot
properties:
  containers:
  - name: whatsapp-bot
    properties:
      image: your-registry/whatsapp-bot:latest
      resources:
        requests:
          cpu: 1
          memoryInGb: 2
      ports:
      - port: 3000
      environmentVariables:
      - name: NODE_ENV
        value: production
      - name: DATABASE_URL
        secureValue: your-database-url
  osType: Linux
  restartPolicy: Always
  ipAddress:
    type: Public
    ports:
    - protocol: tcp
      port: 3000
tags: {}
type: Microsoft.ContainerInstance/containerGroups
```

## Kubernetes Deployment

### 1. Deployment Configuration

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whatsapp-bot
  labels:
    app: whatsapp-bot
spec:
  replicas: 1 # Single replica for WhatsApp connection
  selector:
    matchLabels:
      app: whatsapp-bot
  template:
    metadata:
      labels:
        app: whatsapp-bot
    spec:
      containers:
      - name: whatsapp-bot
        image: your-registry/whatsapp-bot:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: auth-storage
          mountPath: /app/auth_info
      volumes:
      - name: auth-storage
        persistentVolumeClaim:
          claimName: auth-pvc
```

### 2. Service and Ingress

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: whatsapp-bot-service
spec:
  selector:
    app: whatsapp-bot
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: whatsapp-bot-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - bot.yourdomain.com
    secretName: bot-tls
  rules:
  - host: bot.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: whatsapp-bot-service
            port:
              number: 80
```

## Database Integration

### PostgreSQL Setup

```typescript
// database/connection.ts
import { Pool } from 'pg'

export class DatabaseManager {
    private pool: Pool
    
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        })
    }
    
    async query(text: string, params?: any[]) {
        const client = await this.pool.connect()
        try {
            const result = await client.query(text, params)
            return result
        } finally {
            client.release()
        }
    }
    
    async close() {
        await this.pool.end()
    }
}

// database/auth-state.ts
import { AuthenticationState, SignalDataSet } from '@whiskeysockets/baileys'
import { DatabaseManager } from './connection'

export class DatabaseAuthState implements AuthenticationState {
    private db: DatabaseManager
    private userId: string
    
    constructor(db: DatabaseManager, userId: string) {
        this.db = db
        this.userId = userId
    }
    
    get keys(): SignalKeyStore {
        return {
            get: async (type, ids) => {
                const result = await this.db.query(
                    'SELECT key_id, key_data FROM signal_keys WHERE user_id = $1 AND key_type = $2 AND key_id = ANY($3)',
                    [this.userId, type, ids]
                )
                
                const keys: { [id: string]: any } = {}
                for (const row of result.rows) {
                    keys[row.key_id] = row.key_data
                }
                return keys
            },
            
            set: async (data) => {
                const client = await this.db.pool.connect()
                try {
                    await client.query('BEGIN')
                    
                    for (const [type, typeData] of Object.entries(data)) {
                        for (const [id, keyData] of Object.entries(typeData)) {
                            if (keyData === null) {
                                await client.query(
                                    'DELETE FROM signal_keys WHERE user_id = $1 AND key_type = $2 AND key_id = $3',
                                    [this.userId, type, id]
                                )
                            } else {
                                await client.query(`
                                    INSERT INTO signal_keys (user_id, key_type, key_id, key_data)
                                    VALUES ($1, $2, $3, $4)
                                    ON CONFLICT (user_id, key_type, key_id)
                                    DO UPDATE SET key_data = $4, updated_at = CURRENT_TIMESTAMP
                                `, [this.userId, type, id, keyData])
                            }
                        }
                    }
                    
                    await client.query('COMMIT')
                } catch (error) {
                    await client.query('ROLLBACK')
                    throw error
                } finally {
                    client.release()
                }
            }
        }
    }
    
    async loadCreds(): Promise<void> {
        const result = await this.db.query(
            'SELECT creds_data FROM auth_creds WHERE user_id = $1',
            [this.userId]
        )
        
        if (result.rows.length > 0) {
            this._creds = result.rows[0].creds_data
        } else {
            this._creds = initAuthCreds()
        }
    }
    
    async saveCreds(): Promise<void> {
        await this.db.query(`
            INSERT INTO auth_creds (user_id, creds_data)
            VALUES ($1, $2)
            ON CONFLICT (user_id)
            DO UPDATE SET creds_data = $2, updated_at = CURRENT_TIMESTAMP
        `, [this.userId, this._creds])
    }
}
```

## Monitoring and Logging

### Health Checks

```typescript
// health/health-check.ts
import express from 'express'

export class HealthCheck {
    private app = express()
    private isHealthy = true
    private lastActivity = Date.now()
    
    constructor(private sock: WASocket) {
        this.setupRoutes()
        this.monitorConnection()
    }
    
    private setupRoutes() {
        this.app.get('/health', (req, res) => {
            if (this.isHealthy) {
                res.status(200).json({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    memory: process.memoryUsage()
                })
            } else {
                res.status(503).json({
                    status: 'unhealthy',
                    timestamp: new Date().toISOString()
                })
            }
        })
        
        this.app.get('/ready', (req, res) => {
            const isReady = this.sock.ws.readyState === this.sock.ws.OPEN
            
            if (isReady) {
                res.status(200).json({ status: 'ready' })
            } else {
                res.status(503).json({ status: 'not ready' })
            }
        })
    }
    
    private monitorConnection() {
        this.sock.ev.on('connection.update', ({ connection }) => {
            this.isHealthy = connection === 'open'
        })
        
        this.sock.ev.on('messages.upsert', () => {
            this.lastActivity = Date.now()
        })
        
        // Check for stale connections
        setInterval(() => {
            const timeSinceActivity = Date.now() - this.lastActivity
            if (timeSinceActivity > 5 * 60 * 1000) { // 5 minutes
                this.isHealthy = false
            }
        }, 60000)
    }
    
    start(port = 3001) {
        this.app.listen(port, () => {
            console.log(`Health check server running on port ${port}`)
        })
    }
}
```

### Metrics Collection

```typescript
// monitoring/metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client'

export class MetricsCollector {
    private messagesSent = new Counter({
        name: 'whatsapp_messages_sent_total',
        help: 'Total number of messages sent'
    })
    
    private messagesReceived = new Counter({
        name: 'whatsapp_messages_received_total',
        help: 'Total number of messages received'
    })
    
    private connectionDuration = new Histogram({
        name: 'whatsapp_connection_duration_seconds',
        help: 'Duration of WhatsApp connections'
    })
    
    private activeConnections = new Gauge({
        name: 'whatsapp_active_connections',
        help: 'Number of active WhatsApp connections'
    })
    
    constructor(sock: WASocket) {
        this.setupMetrics(sock)
    }
    
    private setupMetrics(sock: WASocket) {
        let connectionStart: number
        
        sock.ev.on('connection.update', ({ connection }) => {
            if (connection === 'open') {
                connectionStart = Date.now()
                this.activeConnections.inc()
            } else if (connection === 'close') {
                if (connectionStart) {
                    this.connectionDuration.observe((Date.now() - connectionStart) / 1000)
                }
                this.activeConnections.dec()
            }
        })
        
        sock.ev.on('messages.upsert', ({ messages }) => {
            this.messagesReceived.inc(messages.length)
        })
        
        // Track sent messages (wrap sendMessage)
        const originalSendMessage = sock.sendMessage
        sock.sendMessage = async (...args) => {
            const result = await originalSendMessage.apply(sock, args)
            this.messagesSent.inc()
            return result
        }
    }
    
    getMetrics() {
        return register.metrics()
    }
}
```

## Scaling Considerations

### Horizontal Scaling

Since WhatsApp connections are tied to specific phone numbers, you can't horizontally scale a single bot. However, you can:

1. **Multiple Bots**: Deploy multiple bots with different phone numbers
2. **Load Balancing**: Use a load balancer to distribute webhook requests
3. **Message Queuing**: Use Redis/RabbitMQ for message processing

### Vertical Scaling

For single bot instances:
- **CPU**: 1-2 cores usually sufficient
- **Memory**: 512MB-2GB depending on message volume
- **Storage**: SSD recommended for session data

### Auto-scaling Configuration

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: whatsapp-bot-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: whatsapp-bot
  minReplicas: 1
  maxReplicas: 1 # Keep at 1 for WhatsApp bots
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Security Best Practices

### 1. Environment Security
- Use secrets management (AWS Secrets Manager, Azure Key Vault)
- Rotate credentials regularly
- Implement least privilege access
- Enable audit logging

### 2. Network Security
- Use VPC/private networks
- Implement firewall rules
- Enable DDoS protection
- Use HTTPS/WSS only

### 3. Application Security
- Validate all inputs
- Implement rate limiting
- Use secure session storage
- Regular security updates

## Backup and Recovery

### Session Backup

```typescript
// backup/session-backup.ts
export class SessionBackup {
    constructor(
        private authState: AuthenticationState,
        private s3Client: S3Client
    ) {}
    
    async backup(): Promise<void> {
        const backup = {
            creds: this.authState.creds,
            keys: await this.getAllKeys(),
            timestamp: Date.now()
        }
        
        const backupData = JSON.stringify(backup)
        const key = `backups/session-${Date.now()}.json`
        
        await this.s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: backupData,
            ServerSideEncryption: 'AES256'
        }))
    }
    
    async restore(backupKey: string): Promise<void> {
        const response = await this.s3Client.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: backupKey
        }))
        
        const backupData = await response.Body?.transformToString()
        const backup = JSON.parse(backupData!)
        
        // Restore credentials and keys
        this.authState.creds = backup.creds
        await this.authState.keys.set(backup.keys)
    }
}
```

## Next Steps

- **[Production Setup](./production-setup.md)**: Detailed production configuration
- **[Scaling](./scaling.md)**: Advanced scaling strategies
- **[Monitoring](./monitoring.md)**: Comprehensive monitoring setup
- **[Best Practices](../12-best-practices/README.md)**: Production best practices

---

> **Important**: Always test your deployment in a staging environment before going to production. Monitor your application closely during the first few days of deployment.
