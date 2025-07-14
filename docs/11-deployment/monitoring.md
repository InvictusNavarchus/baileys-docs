---
id: monitoring
title: Monitoring & Observability
sidebar_position: 4
description: Comprehensive monitoring and observability setup for Baileys applications in production.
keywords: [baileys, monitoring, observability, metrics, logging, alerting, prometheus, grafana]
---

# Monitoring & Observability

This guide covers comprehensive monitoring and observability setup for your Baileys application in production environments.

## Monitoring Stack Overview

### Core Components

1. **Metrics Collection**: Prometheus
2. **Visualization**: Grafana
3. **Log Aggregation**: ELK Stack (Elasticsearch, Logstash, Kibana)
4. **Alerting**: Alertmanager
5. **Tracing**: Jaeger (optional)
6. **Uptime Monitoring**: Custom health checks

## Metrics Collection

### Prometheus Setup

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "baileys_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'baileys-app'
    static_configs:
      - targets: ['localhost:3002']
    scrape_interval: 5s
    metrics_path: /metrics
    
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
      
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['localhost:9121']
      
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']
```

### Application Metrics

```typescript
// monitoring/prometheus-metrics.ts
import client from 'prom-client'

// Create a Registry
const register = new client.Registry()

// Add default metrics
client.collectDefaultMetrics({ register })

// Custom metrics
export const metrics = {
    // Connection metrics
    whatsappConnections: new client.Gauge({
        name: 'whatsapp_connections_total',
        help: 'Total number of WhatsApp connections',
        labelNames: ['instance_id', 'status'],
        registers: [register]
    }),
    
    // Message metrics
    messagesReceived: new client.Counter({
        name: 'messages_received_total',
        help: 'Total number of messages received',
        labelNames: ['instance_id', 'message_type', 'chat_type'],
        registers: [register]
    }),
    
    messagesSent: new client.Counter({
        name: 'messages_sent_total',
        help: 'Total number of messages sent',
        labelNames: ['instance_id', 'message_type', 'status'],
        registers: [register]
    }),
    
    messageProcessingDuration: new client.Histogram({
        name: 'message_processing_duration_seconds',
        help: 'Time spent processing messages',
        labelNames: ['instance_id', 'message_type'],
        buckets: [0.1, 0.5, 1, 2, 5, 10],
        registers: [register]
    }),
    
    // Queue metrics
    queueSize: new client.Gauge({
        name: 'message_queue_size',
        help: 'Current message queue size',
        labelNames: ['queue_type'],
        registers: [register]
    }),
    
    queueProcessingRate: new client.Counter({
        name: 'queue_processing_rate_total',
        help: 'Rate of queue message processing',
        labelNames: ['status'],
        registers: [register]
    }),
    
    // Error metrics
    errors: new client.Counter({
        name: 'errors_total',
        help: 'Total number of errors',
        labelNames: ['instance_id', 'error_type', 'severity'],
        registers: [register]
    }),
    
    // Performance metrics
    memoryUsage: new client.Gauge({
        name: 'memory_usage_bytes',
        help: 'Memory usage in bytes',
        labelNames: ['instance_id', 'type'],
        registers: [register]
    }),
    
    cpuUsage: new client.Gauge({
        name: 'cpu_usage_percent',
        help: 'CPU usage percentage',
        labelNames: ['instance_id'],
        registers: [register]
    }),
    
    // Business metrics
    activeUsers: new client.Gauge({
        name: 'active_users_total',
        help: 'Number of active users',
        labelNames: ['instance_id', 'time_window'],
        registers: [register]
    }),
    
    responseTime: new client.Histogram({
        name: 'response_time_seconds',
        help: 'Response time for user interactions',
        labelNames: ['instance_id', 'command_type'],
        buckets: [0.1, 0.5, 1, 2, 5],
        registers: [register]
    })
}

// Metrics endpoint
export const getMetrics = () => register.metrics()
export { register }
```

### Metrics Collection Service

```typescript
// monitoring/metrics-collector.ts
import { metrics } from './prometheus-metrics'
import { EventEmitter } from 'events'

export class MetricsCollector extends EventEmitter {
    private instanceId: string
    private collectInterval: NodeJS.Timeout | null = null
    
    constructor(instanceId: string) {
        super()
        this.instanceId = instanceId
    }
    
    start(intervalMs = 10000) {
        // Collect system metrics every 10 seconds
        this.collectInterval = setInterval(() => {
            this.collectSystemMetrics()
        }, intervalMs)
        
        console.log(`Metrics collector started for instance ${this.instanceId}`)
    }
    
    stop() {
        if (this.collectInterval) {
            clearInterval(this.collectInterval)
            this.collectInterval = null
        }
    }
    
    private collectSystemMetrics() {
        // Memory usage
        const memUsage = process.memoryUsage()
        metrics.memoryUsage.set(
            { instance_id: this.instanceId, type: 'rss' },
            memUsage.rss
        )
        metrics.memoryUsage.set(
            { instance_id: this.instanceId, type: 'heap_used' },
            memUsage.heapUsed
        )
        metrics.memoryUsage.set(
            { instance_id: this.instanceId, type: 'heap_total' },
            memUsage.heapTotal
        )
        
        // CPU usage (simplified)
        const cpuUsage = process.cpuUsage()
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to seconds
        metrics.cpuUsage.set({ instance_id: this.instanceId }, cpuPercent)
    }
    
    // WhatsApp connection events
    onConnectionUpdate(status: string) {
        metrics.whatsappConnections.set(
            { instance_id: this.instanceId, status },
            status === 'open' ? 1 : 0
        )
    }
    
    // Message events
    onMessageReceived(messageType: string, chatType: string) {
        metrics.messagesReceived.inc({
            instance_id: this.instanceId,
            message_type: messageType,
            chat_type: chatType
        })
    }
    
    onMessageSent(messageType: string, status: string) {
        metrics.messagesSent.inc({
            instance_id: this.instanceId,
            message_type: messageType,
            status
        })
    }
    
    onMessageProcessed(messageType: string, duration: number) {
        metrics.messageProcessingDuration.observe(
            { instance_id: this.instanceId, message_type: messageType },
            duration / 1000 // Convert to seconds
        )
    }
    
    // Queue events
    onQueueSizeUpdate(queueType: string, size: number) {
        metrics.queueSize.set({ queue_type: queueType }, size)
    }
    
    onQueueProcessed(status: string) {
        metrics.queueProcessingRate.inc({ status })
    }
    
    // Error events
    onError(errorType: string, severity: string) {
        metrics.errors.inc({
            instance_id: this.instanceId,
            error_type: errorType,
            severity
        })
    }
    
    // Business metrics
    onActiveUsersUpdate(timeWindow: string, count: number) {
        metrics.activeUsers.set(
            { instance_id: this.instanceId, time_window: timeWindow },
            count
        )
    }
    
    onUserResponse(commandType: string, responseTime: number) {
        metrics.responseTime.observe(
            { instance_id: this.instanceId, command_type: commandType },
            responseTime / 1000
        )
    }
}
```

## Logging Setup

### Structured Logging

```typescript
// logging/structured-logger.ts
import winston from 'winston'
import { ElasticsearchTransport } from 'winston-elasticsearch'

const esTransportOpts = {
    level: 'info',
    clientOpts: {
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
    },
    index: 'baileys-logs',
    indexTemplate: {
        name: 'baileys-logs-template',
        pattern: 'baileys-logs-*',
        settings: {
            number_of_shards: 1,
            number_of_replicas: 0
        },
        mappings: {
            properties: {
                '@timestamp': { type: 'date' },
                level: { type: 'keyword' },
                message: { type: 'text' },
                instanceId: { type: 'keyword' },
                userId: { type: 'keyword' },
                chatId: { type: 'keyword' },
                messageType: { type: 'keyword' },
                duration: { type: 'long' },
                error: {
                    properties: {
                        message: { type: 'text' },
                        stack: { type: 'text' },
                        code: { type: 'keyword' }
                    }
                }
            }
        }
    }
}

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: {
        service: 'baileys-bot',
        instanceId: process.env.INSTANCE_ID || 'default'
    },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10485760,
            maxFiles: 10
        }),
        new ElasticsearchTransport(esTransportOpts)
    ]
})

// Structured logging helpers
export const loggers = {
    connection: (instanceId: string, status: string, details?: any) => {
        logger.info('WhatsApp connection update', {
            instanceId,
            status,
            details,
            category: 'connection'
        })
    },
    
    message: (instanceId: string, type: 'received' | 'sent', messageData: any) => {
        logger.info(`Message ${type}`, {
            instanceId,
            messageType: messageData.type,
            chatId: messageData.chatId,
            userId: messageData.userId,
            category: 'message'
        })
    },
    
    error: (instanceId: string, error: Error, context?: any) => {
        logger.error('Application error', {
            instanceId,
            error: {
                message: error.message,
                stack: error.stack,
                code: (error as any).code
            },
            context,
            category: 'error'
        })
    },
    
    performance: (instanceId: string, operation: string, duration: number, metadata?: any) => {
        logger.info('Performance metric', {
            instanceId,
            operation,
            duration,
            metadata,
            category: 'performance'
        })
    },
    
    business: (instanceId: string, event: string, data: any) => {
        logger.info('Business event', {
            instanceId,
            event,
            data,
            category: 'business'
        })
    }
}
```

## Health Checks

### Comprehensive Health Monitoring

```typescript
// monitoring/health-checker.ts
import { EventEmitter } from 'events'

interface HealthCheck {
    name: string
    check: () => Promise<{ status: 'healthy' | 'unhealthy', details?: any }>
    timeout: number
    interval: number
}

export class HealthChecker extends EventEmitter {
    private checks = new Map<string, HealthCheck>()
    private results = new Map<string, any>()
    private intervals = new Map<string, NodeJS.Timeout>()
    
    addCheck(check: HealthCheck) {
        this.checks.set(check.name, check)
        this.startCheck(check.name)
    }
    
    removeCheck(name: string) {
        const interval = this.intervals.get(name)
        if (interval) {
            clearInterval(interval)
            this.intervals.delete(name)
        }
        this.checks.delete(name)
        this.results.delete(name)
    }
    
    private startCheck(name: string) {
        const check = this.checks.get(name)
        if (!check) return
        
        const runCheck = async () => {
            try {
                const result = await Promise.race([
                    check.check(),
                    new Promise<{ status: 'unhealthy', details: any }>((_, reject) =>
                        setTimeout(() => reject(new Error('Health check timeout')), check.timeout)
                    )
                ])
                
                this.results.set(name, {
                    ...result,
                    timestamp: new Date(),
                    duration: Date.now() - start
                })
                
                this.emit('health.check', name, result)
            } catch (error) {
                const result = {
                    status: 'unhealthy' as const,
                    details: { error: error.message },
                    timestamp: new Date(),
                    duration: Date.now() - start
                }
                
                this.results.set(name, result)
                this.emit('health.check', name, result)
            }
        }
        
        // Run immediately
        const start = Date.now()
        runCheck()
        
        // Schedule periodic checks
        const interval = setInterval(runCheck, check.interval)
        this.intervals.set(name, interval)
    }
    
    getHealth() {
        const checks = Object.fromEntries(this.results)
        const overallStatus = Object.values(checks).every(
            (check: any) => check.status === 'healthy'
        ) ? 'healthy' : 'unhealthy'
        
        return {
            status: overallStatus,
            timestamp: new Date(),
            checks
        }
    }
    
    stop() {
        for (const interval of this.intervals.values()) {
            clearInterval(interval)
        }
        this.intervals.clear()
    }
}

// Predefined health checks
export const createHealthChecks = (instanceManager: any, redis: any, db: any) => {
    const healthChecker = new HealthChecker()
    
    // WhatsApp connection health
    healthChecker.addCheck({
        name: 'whatsapp_connection',
        timeout: 5000,
        interval: 30000,
        check: async () => {
            const activeInstances = instanceManager.getActiveInstances()
            const totalInstances = instanceManager.getInstanceStats().total
            
            if (activeInstances.length === 0) {
                return {
                    status: 'unhealthy',
                    details: { message: 'No active WhatsApp connections' }
                }
            }
            
            return {
                status: 'healthy',
                details: {
                    activeInstances: activeInstances.length,
                    totalInstances
                }
            }
        }
    })
    
    // Redis health
    healthChecker.addCheck({
        name: 'redis',
        timeout: 3000,
        interval: 15000,
        check: async () => {
            try {
                await redis.ping()
                const info = await redis.info('memory')
                return {
                    status: 'healthy',
                    details: { info }
                }
            } catch (error) {
                return {
                    status: 'unhealthy',
                    details: { error: error.message }
                }
            }
        }
    })
    
    // Database health
    healthChecker.addCheck({
        name: 'database',
        timeout: 5000,
        interval: 30000,
        check: async () => {
            try {
                const result = await db.query('SELECT 1 as health')
                return {
                    status: 'healthy',
                    details: { connected: true }
                }
            } catch (error) {
                return {
                    status: 'unhealthy',
                    details: { error: error.message }
                }
            }
        }
    })
    
    // Memory health
    healthChecker.addCheck({
        name: 'memory',
        timeout: 1000,
        interval: 10000,
        check: async () => {
            const usage = process.memoryUsage()
            const usagePercent = (usage.heapUsed / usage.heapTotal) * 100
            
            if (usagePercent > 90) {
                return {
                    status: 'unhealthy',
                    details: { usagePercent, message: 'High memory usage' }
                }
            }
            
            return {
                status: 'healthy',
                details: { usagePercent, usage }
            }
        }
    })
    
    return healthChecker
}
```

## Alerting Rules

### Prometheus Alerting Rules

```yaml
# baileys_rules.yml
groups:
  - name: baileys.rules
    rules:
      # Connection alerts
      - alert: WhatsAppConnectionDown
        expr: whatsapp_connections_total{status="open"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "WhatsApp connection is down"
          description: "Instance {{ $labels.instance_id }} has no active WhatsApp connection"
          
      - alert: HighMessageProcessingTime
        expr: histogram_quantile(0.95, message_processing_duration_seconds) > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High message processing time"
          description: "95th percentile message processing time is {{ $value }}s"
          
      # Queue alerts
      - alert: MessageQueueBacklog
        expr: message_queue_size{queue_type="pending"} > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Message queue backlog"
          description: "Pending message queue size is {{ $value }}"
          
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate"
          description: "Error rate is {{ $value }} errors/second"
          
      # Resource alerts
      - alert: HighMemoryUsage
        expr: memory_usage_bytes{type="heap_used"} / memory_usage_bytes{type="heap_total"} > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"
          
      - alert: InstanceDown
        expr: up{job="baileys-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Baileys instance is down"
          description: "Instance {{ $labels.instance }} is not responding"
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@yourdomain.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5001/webhook'
        
  - name: 'critical-alerts'
    email_configs:
      - to: 'admin@yourdomain.com'
        subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'Critical Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        
  - name: 'warning-alerts'
    email_configs:
      - to: 'team@yourdomain.com'
        subject: 'WARNING: {{ .GroupLabels.alertname }}'
```

## Grafana Dashboards

### Main Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Baileys WhatsApp Bot Monitoring",
    "panels": [
      {
        "title": "Connection Status",
        "type": "stat",
        "targets": [
          {
            "expr": "whatsapp_connections_total{status=\"open\"}",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "title": "Message Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(messages_received_total[5m])",
            "legendFormat": "Received/sec"
          },
          {
            "expr": "rate(messages_sent_total[5m])",
            "legendFormat": "Sent/sec"
          }
        ]
      },
      {
        "title": "Message Processing Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, message_processing_duration_seconds)",
            "legendFormat": "50th percentile"
          },
          {
            "expr": "histogram_quantile(0.95, message_processing_duration_seconds)",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Queue Size",
        "type": "graph",
        "targets": [
          {
            "expr": "message_queue_size",
            "legendFormat": "{{ queue_type }}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(errors_total[5m])",
            "legendFormat": "{{ error_type }}"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "memory_usage_bytes{type=\"heap_used\"}",
            "legendFormat": "Heap Used"
          },
          {
            "expr": "memory_usage_bytes{type=\"heap_total\"}",
            "legendFormat": "Heap Total"
          }
        ]
      }
    ]
  }
}
```

## Docker Compose for Monitoring

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./baileys_rules.yml:/etc/prometheus/baileys_rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
      
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
      
  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
      
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
      
  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
  elasticsearch_data:
```

## Best Practices

### 1. Metric Naming
- Use consistent naming conventions
- Include units in metric names
- Use labels for dimensions

### 2. Alert Fatigue Prevention
- Set appropriate thresholds
- Use alert grouping
- Implement alert escalation

### 3. Log Management
- Use structured logging
- Implement log rotation
- Set appropriate log levels

### 4. Dashboard Design
- Focus on key metrics
- Use appropriate visualizations
- Include context and annotations

---

**Related Pages:**
- [Production Setup](./production-setup.md) - Production deployment
- [Scaling](./scaling.md) - Application scaling
