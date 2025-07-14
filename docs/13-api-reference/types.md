---
id: types
title: Type Definitions
sidebar_position: 5
description: Complete TypeScript type definitions for Baileys library.
keywords: [baileys, typescript, types, interfaces, definitions]
---

# Type Definitions

This page provides comprehensive TypeScript type definitions used throughout the Baileys library.

## Core Types

### WASocket

The main socket interface for WhatsApp operations.

```typescript
interface WASocket {
    // Connection properties
    ws: WebSocket
    ev: EventEmitter
    authState: AuthenticationState
    user?: Contact
    
    // State
    isOnline: boolean
    msgCount: number
    
    // Configuration
    config: SocketConfig
    
    // Core methods
    connect(): Promise<void>
    end(error?: Error): void
    logout(): Promise<void>
    
    // Authentication
    requestPairingCode(phoneNumber: string): Promise<string>
    
    // Messaging
    sendMessage(jid: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<proto.WebMessageInfo>
    sendPresenceUpdate(type: WAPresence, jid?: string): Promise<void>
    readMessages(keys: WAMessageKey[]): Promise<void>
    
    // Groups
    groupCreate(subject: string, participants: string[]): Promise<GroupMetadata>
    groupParticipantsUpdate(jid: string, participants: string[], action: ParticipantAction): Promise<{ status: string, jid: string }[]>
    groupMetadata(jid: string): Promise<GroupMetadata>
    
    // ... more methods
}
```

### Authentication Types

```typescript
interface AuthenticationState {
    creds: AuthenticationCreds
    keys: SignalKeyStoreWithTransaction
}

interface AuthenticationCreds {
    noiseKey: KeyPair
    pairingEphemeralKeyPair: KeyPair
    signedIdentityKey: KeyPair
    signedPreKey: SignedKeyPair
    registrationId: number
    advSecretKey: string
    
    processedHistoryMessages: ProcessedHistoryMessage[]
    nextPreKeyId: number
    firstUnuploadedPreKeyId: number
    accountSyncCounter: number
    accountSettings: AccountSettings
    
    me?: Contact
    account?: proto.IADVSignedDeviceIdentity
    signalIdentities?: SignalIdentity[]
    myAppStateKeyId?: string
    platform?: string
    registered?: boolean
    backupToken?: Uint8Array
    registration?: ContactRegistration
}

interface KeyPair {
    private: Uint8Array
    public: Uint8Array
}

interface SignedKeyPair extends KeyPair {
    keyId: number
    signature: Uint8Array
}
```

### Message Types

```typescript
interface WAMessage {
    key: WAMessageKey
    message?: proto.IMessage
    messageTimestamp?: number | Long
    status?: WAMessageStatus
    participant?: string
    pushName?: string
    broadcast?: boolean
    messageStubType?: proto.WebMessageInfo.StubType
    clearMedia?: boolean
    messageStubParameters?: string[]
    duration?: number
    labels?: string[]
    paymentInfo?: PaymentInfo
    finalLiveLocation?: LiveLocationMessage
    quotedPaymentInfo?: PaymentInfo
    ephemeralStartTimestamp?: number | Long
    ephemeralDuration?: number
    ephemeralOffToOn?: boolean
    disappearingMode?: DisappearingMode
    reactions?: ReactionMessage[]
    mediaData?: MediaData
    photoChange?: PhotoChange
    userReceipt?: UserReceipt[]
    pollUpdates?: PollUpdate[]
}

interface WAMessageKey {
    remoteJid?: string
    fromMe?: boolean
    id?: string
    participant?: string
}

enum WAMessageStatus {
    ERROR = 0,
    PENDING = 1,
    SERVER_ACK = 2,
    DELIVERY_ACK = 3,
    READ = 4,
    PLAYED = 5
}

type AnyMessageContent = 
    | TextMessageContent
    | ImageMessageContent
    | VideoMessageContent
    | AudioMessageContent
    | DocumentMessageContent
    | LocationMessageContent
    | ContactsMessageContent
    | PollMessageContent
    | ReactionMessageContent
    | ForwardMessageContent
    | DeleteMessageContent
    | EditMessageContent

interface TextMessageContent {
    text: string
    mentions?: string[]
}

interface ImageMessageContent {
    image: WAMediaUpload
    caption?: string
    jpegThumbnail?: Buffer
    mimetype?: string
}

interface VideoMessageContent {
    video: WAMediaUpload
    caption?: string
    gifPlayback?: boolean
    jpegThumbnail?: Buffer
    mimetype?: string
}

interface AudioMessageContent {
    audio: WAMediaUpload
    mimetype?: string
    ptt?: boolean
    seconds?: number
}

interface DocumentMessageContent {
    document: WAMediaUpload
    fileName?: string
    mimetype?: string
    caption?: string
    jpegThumbnail?: Buffer
}

interface LocationMessageContent {
    location: LocationMessage
}

interface ContactsMessageContent {
    contacts: ContactsArrayMessage
}

interface PollMessageContent {
    poll: PollCreationMessage
}

interface ReactionMessageContent {
    react: ReactionMessage
}

interface ForwardMessageContent {
    forward: WAMessage
}

interface DeleteMessageContent {
    delete: WAMessageKey
}

interface EditMessageContent {
    edit: WAMessageKey
    text: string
}
```

### Media Types

```typescript
type WAMediaUpload = 
    | { url: string }
    | { stream: Readable }
    | Buffer
    | Uint8Array

interface MediaData {
    type: 'image' | 'video' | 'audio' | 'document'
    data: Buffer
    mimetype: string
    filename?: string
}

interface DownloadMediaMessageOptions {
    logger?: Logger
    reuploadRequest?: (msg: WAMessage) => Promise<WAMessage>
}
```

### Group Types

```typescript
interface GroupMetadata {
    id: string
    owner: string | undefined
    subject: string
    subjectOwner?: string
    subjectTime?: number
    creation?: number
    desc?: string
    descOwner?: string
    descId?: string
    restrict?: boolean
    announce?: boolean
    size?: number
    participants: GroupParticipant[]
    ephemeralDuration?: number
    inviteCode?: string
    linkedParent?: string
    memberAddMode?: string
    joinApprovalMode?: boolean
    isParentGroup?: boolean
    isDefaultSubgroup?: boolean
    parentGroup?: string
}

interface GroupParticipant {
    id: string
    admin?: 'admin' | 'superadmin' | null
    isSuperAdmin?: boolean
    isAdmin?: boolean
}

type ParticipantAction = 'add' | 'remove' | 'promote' | 'demote'
type GroupSetting = 'announcement' | 'not_announcement' | 'locked' | 'unlocked'
```

### Contact Types

```typescript
interface Contact {
    id: string
    lid?: string
    name?: string
    notify?: string
    verifiedName?: string
    imgUrl?: string | null
    status?: string
    statusTimestamp?: number
    pushName?: string
    verifiedLevel?: number
}

interface ContactsArrayMessage {
    displayName?: string
    contacts: ContactMessage[]
}

interface ContactMessage {
    displayName?: string
    vcard?: string
}
```

### Connection Types

```typescript
interface ConnectionState {
    connection: WAConnectionState
    lastDisconnect?: {
        error: Error | undefined
        date: Date
    }
    isNewLogin?: boolean
    qr?: string
    receivedPendingNotifications?: boolean
    isOnline?: boolean
}

type WAConnectionState = 'open' | 'connecting' | 'close'

enum DisconnectReason {
    connectionClosed = 428,
    connectionLost = 408,
    connectionReplaced = 440,
    timedOut = 408,
    loggedOut = 401,
    badSession = 500,
    restartRequired = 515,
    multideviceMismatch = 411
}

type WAPresence = 'unavailable' | 'available' | 'composing' | 'recording' | 'paused'

interface PresenceData {
    lastKnownPresence: WAPresence
    lastSeen?: number
}
```

### Event Types

```typescript
interface BaileysEventMap {
    'connection.update': ConnectionState
    'creds.update': void
    'messages.upsert': { messages: WAMessage[], type: MessageUpsertType }
    'messages.update': WAMessageUpdate[]
    'messages.delete': { keys: WAMessageKey[] }
    'message-receipt.update': MessageUserReceiptUpdate[]
    'chats.upsert': Chat[]
    'chats.update': ChatUpdate[]
    'chats.delete': string[]
    'presence.update': { id: string, presences: { [participant: string]: PresenceData } }
    'contacts.upsert': Contact[]
    'contacts.update': Partial<Contact>[]
    'groups.upsert': GroupMetadata[]
    'groups.update': Partial<GroupMetadata>[]
    'group-participants.update': {
        id: string
        participants: string[]
        action: ParticipantAction
        author?: string
    }
    'blocklist.set': { blocklist: string[] }
    'blocklist.update': { blocklist: string[], type: 'add' | 'remove' }
    'call': WACallEvent[]
    'labels.edit': Label
    'labels.association': {
        association: LabelAssociation
        type: 'add' | 'remove'
    }
}

type MessageUpsertType = 'append' | 'notify'

interface WAMessageUpdate {
    key: WAMessageKey
    update: Partial<WAMessage>
}

interface MessageUserReceiptUpdate {
    key: WAMessageKey
    receipt: UserReceipt
}

interface Chat {
    id: string
    name?: string
    conversationTimestamp?: number
    unreadCount?: number
    archived?: boolean
    readOnly?: boolean
    ephemeralExpiration?: number
    ephemeralSettingTimestamp?: number
    endOfHistoryTransfer?: boolean
    clearTimestamp?: number
    notSpam?: boolean
    isDefaultSubgroup?: boolean
    isParentGroup?: boolean
    isParentGroupClosed?: boolean
    lastMsgTimestamp?: number
    pinned?: number
    tcToken?: Uint8Array
    tcTokenTimestamp?: number
    contactPrimaryIdentityKey?: Uint8Array
    lidJid?: string
    username?: string
    disappearingMode?: DisappearingMode
    support?: boolean
    parentGroupId?: string
    isGroup?: boolean
    participant?: GroupParticipant[]
    tcTokenSenderTimestamp?: number
    suspended?: boolean
    terminated?: boolean
    createdAt?: number
    createdBy?: string
    description?: string
    support?: boolean
    isAnnounceGrpHistoryOnAdd?: boolean
    reportSpamState?: number
}

interface ChatUpdate extends Partial<Chat> {
    id: string
}
```

### Configuration Types

```typescript
interface SocketConfig {
    // Connection
    waWebSocketUrl?: string
    connectTimeoutMs?: number
    keepAliveIntervalMs?: number
    
    // Authentication
    auth: AuthenticationState
    
    // Browser
    browser?: WABrowserDescription
    printQRInTerminal?: boolean
    
    // Features
    emitOwnEvents?: boolean
    syncFullHistory?: boolean
    markOnlineOnConnect?: boolean
    
    // Caching
    userDevicesCache?: CacheStore
    msgRetryCounterCache?: CacheStore
    mediaCache?: CacheStore
    
    // Message handling
    getMessage?: GetMessageFunction
    cachedGroupMetadata?: GetGroupMetadataFunction
    patchMessageBeforeSending?: MessagePatcher
    shouldSyncHistoryMessage?: HistoryMessageFilter
    shouldIgnoreJid?: JidFilter
    
    // Network
    retryRequestDelayMs?: number
    maxMsgRetryCount?: number
    fireInitQueries?: boolean
    
    // Media
    generateHighQualityLinkPreview?: boolean
    options?: AxiosRequestConfig
    
    // Logging
    logger?: Logger
}

interface WABrowserDescription {
    [0]: string // name
    [1]: string // version
    [2]: string // os
}

interface MiscMessageGenerationOptions {
    quoted?: WAMessage
    ephemeralExpiration?: number
    messageId?: string
    additionalAttributes?: { [key: string]: string }
    statusJidList?: string[]
    backgroundColor?: string
    font?: number
}
```

### Utility Types

```typescript
// JID utilities
type JidWithDevice = `${string}@${string}.${string}:${number}`
type JidServer = 's.whatsapp.net' | 'g.us' | 'broadcast' | 'status@broadcast'

interface JidDecode {
    user: string
    server: string
    agent?: number
    device?: number
}

// Cache types
interface CacheStore {
    get(key: string): any
    set(key: string, value: any): void
    del(key: string): void
    flushAll(): void
}

// Function types
type GetMessageFunction = (key: WAMessageKey) => Promise<WAMessage | undefined>
type GetGroupMetadataFunction = (jid: string) => Promise<GroupMetadata | undefined>
type MessagePatcher = (message: proto.IWebMessageInfo, recipientJids: string[]) => proto.IWebMessageInfo
type HistoryMessageFilter = (message: proto.IHistorySyncNotification) => boolean
type JidFilter = (jid: string) => boolean

// Logger interface
interface Logger {
    level: string
    fatal(msg: any, ...args: any[]): void
    error(msg: any, ...args: any[]): void
    warn(msg: any, ...args: any[]): void
    info(msg: any, ...args: any[]): void
    debug(msg: any, ...args: any[]): void
    trace(msg: any, ...args: any[]): void
    child(bindings: any): Logger
}
```

### Business Types

```typescript
interface BusinessProfile {
    business_id?: string
    email?: string
    description?: string
    website?: string[]
    category?: string
    address?: string
    latitude?: number
    longitude?: number
    profile_options?: number
}

interface Product {
    product_id?: string
    title?: string
    description?: string
    currency_code?: string
    price_amount_1000?: number
    retailer_id?: string
    url?: string
    product_image_count?: number
    first_image_id?: string
    salability?: number
}

interface Catalog {
    catalog_id?: string
    title?: string
    description?: string
    product_count?: number
    products?: Product[]
}

interface Order {
    order_id?: string
    thumbnail?: string
    item_count?: number
    status?: number
    surface?: number
    message?: string
    order_title?: string
    seller_jid?: string
    token?: string
    total_amount_1000?: number
    total_currency_code?: string
}
```

### Newsletter Types

```typescript
interface NewsletterMetadata {
    id: string
    name?: string
    description?: string
    invite?: string
    handle?: string
    picture?: string
    preview?: string
    reaction_codes?: ReactionCode[]
    subscriber_count?: number
    verification?: string
    viewer_metadata?: ViewerMetadata[]
}

interface ReactionCode {
    code?: string
    count?: number
}

interface ViewerMetadata {
    view_role?: string
    mute?: string
}
```

---

For usage examples and implementation details, see:
- [Socket API](./socket-api.md)
- [Message API](./message-api.md)
- [Group API](./group-api.md)
