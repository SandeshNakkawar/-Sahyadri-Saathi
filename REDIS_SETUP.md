# Redis Setup Guide

## Overview

Redis is used for **webhook event deduplication** to prevent processing the same Stripe webhook multiple times. This is especially important when running multiple server instances.

## Installation

### 1. Install Redis Package

```bash
npm install redis
```

### 2. Install Redis Server

#### Windows:
- Download from: https://github.com/microsoftarchive/redis/releases
- Or use WSL: `sudo apt-get install redis-server`

#### macOS:
```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### 3. Environment Variables

Add to your `.env` file:

```env
# Redis Configuration (optional - defaults to localhost:6379)
REDIS_URL=redis://localhost:6379

# Or for remote Redis:
# REDIS_URL=redis://username:password@host:port
# REDIS_URL=rediss://username:password@host:port  # SSL connection
```

## How It Works

### Webhook Deduplication

- **Without Redis**: Uses in-memory Set (only works for single server instance)
- **With Redis**: Shared across all server instances (production-ready)

### Fallback Behavior

If Redis is unavailable, the system automatically falls back to in-memory storage. Your application will continue to work, but webhook deduplication will only work within a single server instance.

## Testing Redis Connection

1. Start your server:
```bash
npm start
```

2. Look for these messages:
   - ✅ `Redis: Connected and ready` - Redis is working
   - ℹ️ `Redis not available (optional - using in-memory fallback)` - Redis unavailable, using fallback (this is OK!)

## Disabling Redis (Optional)

If you don't want to use Redis at all, you can disable it:

Add to `.env`:
```env
REDIS_ENABLED=false
```

This will prevent any connection attempts and use in-memory fallback only.

## Troubleshooting

### Error: `ECONNREFUSED 127.0.0.1:6379`

This means Redis server is not running. You have two options:

1. **Install and start Redis** (if you want to use it):
   - See installation instructions above
   - Start Redis: `redis-server` (or `brew services start redis` on macOS)

2. **Ignore the error** (if you don't need Redis):
   - The app will automatically use in-memory fallback
   - Everything will work fine, just without distributed deduplication
   - You can disable Redis entirely by setting `REDIS_ENABLED=false` in `.env`

## Production Deployment

### Redis Cloud (Recommended for Production)

1. Sign up at: https://redis.com/try-free/
2. Create a database
3. Copy the connection URL
4. Add to `.env`:
```env
REDIS_URL=rediss://default:password@host:port
```

### Self-Hosted Redis

For production, ensure:
- Redis persistence is enabled
- Redis is running as a service
- Firewall rules allow connections
- SSL/TLS for remote connections

## Benefits

1. **Distributed Deduplication**: Works across multiple server instances
2. **Automatic Expiration**: Webhook events expire after 24 hours
3. **High Performance**: Sub-millisecond lookups
4. **Scalability**: Handles high webhook volumes
5. **Resilience**: Automatic fallback if Redis is unavailable

## Monitoring

Check Redis status:
```bash
redis-cli ping
# Should return: PONG
```

View webhook keys:
```bash
redis-cli KEYS "webhook:session:*"
```

