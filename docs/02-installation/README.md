# Installation & Setup

This guide will walk you through installing Baileys and setting up your development environment for building WhatsApp bots.

## Prerequisites

Before installing Baileys, ensure your system meets these requirements:

### System Requirements

- **Node.js**: Version 20.0.0 or higher
- **Operating System**: Linux, macOS, or Windows
- **Memory**: Minimum 512MB RAM available
- **Storage**: At least 100MB free space

### Required Knowledge

- Basic understanding of Node.js and npm/yarn
- Familiarity with TypeScript (recommended)
- Understanding of async/await and Promises

## Installation Methods

### Method 1: Using npm (Recommended)

```bash
# Install the stable version
npm install @whiskeysockets/baileys

# For TypeScript projects, also install types
npm install --save-dev @types/node
```

### Method 2: Using yarn

```bash
# Install the stable version
yarn add @whiskeysockets/baileys

# For TypeScript projects
yarn add --dev @types/node
```

### Method 3: Edge Version (Latest Features)

If you want the latest features and fixes (may be unstable):

```bash
# Using npm
npm install github:WhiskeySockets/Baileys

# Using yarn
yarn add github:WhiskeySockets/Baileys
```

## Optional Dependencies

Baileys has several optional peer dependencies that enhance functionality:

### Media Processing

```bash
# For image processing (thumbnails, resizing)
npm install sharp
# Alternative: npm install jimp

# For audio processing
npm install audio-decode

# For link previews
npm install link-preview-js
```

### Performance Enhancements

```bash
# For faster caching
npm install @cacheable/node-cache

# For better logging
npm install pino
```

## Project Setup

### 1. Initialize Your Project

```bash
# Create a new directory
mkdir my-whatsapp-bot
cd my-whatsapp-bot

# Initialize npm project
npm init -y

# Install Baileys
npm install @whiskeysockets/baileys
```

### 2. TypeScript Setup (Recommended)

```bash
# Install TypeScript
npm install --save-dev typescript @types/node ts-node

# Create tsconfig.json
npx tsc --init
```

Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. Project Structure

Create the following directory structure:

```
my-whatsapp-bot/
├── src/
│   ├── index.ts          # Main application file
│   ├── handlers/         # Message handlers
│   ├── utils/           # Utility functions
│   └── types/           # Custom type definitions
├── auth_info/           # Authentication data (auto-generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Configuration

### 1. Environment Variables

Create a `.env` file for configuration:

```bash
# .env
NODE_ENV=development
LOG_LEVEL=info
PHONE_NUMBER=your_phone_number
```

### 2. Install dotenv

```bash
npm install dotenv
npm install --save-dev @types/dotenv
```

## Verification

### 1. Basic Import Test

Create `src/test.ts`:

```typescript
import makeWASocket from '@whiskeysockets/baileys'

console.log('Baileys imported successfully!')
console.log('Version:', require('@whiskeysockets/baileys/package.json').version)
```

Run the test:

```bash
npx ts-node src/test.ts
```

### 2. Connection Test

Create `src/connection-test.ts`:

```typescript
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

async function testConnection() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Connection closed due to:', lastDisconnect?.error, 'Reconnecting:', shouldReconnect)
            
            if (shouldReconnect) {
                testConnection()
            }
        } else if (connection === 'open') {
            console.log('✅ Connection successful!')
            process.exit(0)
        }
    })
    
    sock.ev.on('creds.update', saveCreds)
}

testConnection()
```

Run the connection test:

```bash
npx ts-node src/connection-test.ts
```

## Common Installation Issues

### Issue 1: Node.js Version

**Error**: `engine-requirements.js` fails

**Solution**: Upgrade to Node.js 20.0.0 or higher:

```bash
# Using nvm
nvm install 20
nvm use 20

# Verify version
node --version
```

### Issue 2: Sharp Installation

**Error**: Sharp fails to install on some systems

**Solution**: Use jimp as alternative:

```bash
npm uninstall sharp
npm install jimp
```

### Issue 3: libsignal Compilation

**Error**: libsignal fails to compile

**Solution**: Install build tools:

```bash
# On Ubuntu/Debian
sudo apt-get install build-essential python3

# On macOS
xcode-select --install

# On Windows
npm install --global windows-build-tools
```

### Issue 4: Permission Errors

**Error**: EACCES permission errors

**Solution**: Fix npm permissions:

```bash
# Create global directory
mkdir ~/.npm-global

# Configure npm
npm config set prefix '~/.npm-global'

# Add to PATH in ~/.bashrc or ~/.zshrc
export PATH=~/.npm-global/bin:$PATH
```

## Development Tools

### 1. Recommended VS Code Extensions

- **TypeScript Importer**: Auto-import TypeScript modules
- **Prettier**: Code formatting
- **ESLint**: Code linting
- **GitLens**: Git integration

### 2. Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src/**/*.ts"
  }
}
```

### 3. Debugging Setup

Create `.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug Bot",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/src/index.ts",
            "runtimeArgs": ["-r", "ts-node/register"],
            "env": {
                "NODE_ENV": "development"
            },
            "console": "integratedTerminal",
            "internalConsoleOptions": "neverOpen"
        }
    ]
}
```

## Next Steps

Now that you have Baileys installed and configured, you're ready to:

1. **[Quick Start Guide](./quick-start.md)**: Build your first bot in 5 minutes
2. **[Architecture Overview](../03-architecture/README.md)**: Understand how Baileys works
3. **[Authentication](../04-authentication/README.md)**: Learn about session management

## Getting Help

If you encounter issues during installation:

1. Check the [Troubleshooting Guide](../14-troubleshooting/README.md)
2. Search existing [GitHub Issues](https://github.com/WhiskeySockets/Baileys/issues)
3. Ask for help in our [Discord community](https://discord.gg/WeJM5FP9GG)

---

> **Tip**: Keep your Baileys installation up to date by regularly running `npm update @whiskeysockets/baileys` to get the latest features and bug fixes.
