# Authentication System Guide

## Table of Contents

1. [Introduction](#introduction)
2. [How Authentication Works Step-by-Step](#how-authentication-works-step-by-step)
3. [Architecture Overview](#architecture-overview)
4. [Integration Guide](#integration-guide)
5. [Migration to Backend](#migration-to-backend)

---

## Introduction

### What This Guide Is About

This guide explains how the authentication system works in our application. It uses a JWT-like token structure stored in localStorage to mimic server-side authentication, making it easy to connect to a real backend later.

### Why JWT-like Tokens?

**Problem**: We need a way to authenticate users and maintain their session across page reloads, but we don't have a backend yet.

**Solution**: We use a JWT-like token structure that:
- Stores user information in a standardized format
- Can be easily decoded to extract user data
- Mimics real JWT behavior for easy backend integration later
- Provides a clean abstraction layer

### Current vs Future Implementation

**Current (localStorage)**:
- Tokens stored in browser localStorage
- Mock JWT encoding/decoding
- Client-side session management

**Future (Server-side)**:
- Tokens stored in httpOnly cookies
- Real JWT tokens from backend
- Server-validated sessions

**Key Point**: The abstraction layer means components don't need to change when we connect to the backend - only `lib/auth.ts` needs updates.

### Key Concepts

- **Session**: User's authentication state (userId, userType, email, timestamp)
- **Token**: Encoded session data in JWT-like format (`header.payload.signature`)
- **Context**: React Context that provides user state globally
- **Migration**: Automatic conversion from old `userType` localStorage to new auth system

### File Structure

```
frontend/
├── lib/
│   ├── types/
│   │   └── auth.ts          # Type definitions
│   ├── auth.ts              # Main auth service
│   └── auth-utils.ts        # Token encoding/decoding
├── components/
│   └── user-context.tsx     # React Context for user state
└── app/
    └── (sign)/
        └── sign-in/
            ├── page.tsx              # Regular sign-in
            └── password/
                └── page.tsx          # Password sign-in
```

---

## How Authentication Works Step-by-Step

### Step 1: User Signs In

**Problem**: When a user enters credentials, we need to authenticate them and create a persistent session that survives page reloads.

**Solution**: The `signIn()` function creates a session object, encodes it into a JWT-like token, and stores both in localStorage.

**Code Example**:

```33:59:lib/auth.ts
export async function signIn(
  credentials: SignInCredentials,
  userType: UserType
): Promise<AuthToken> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const session: UserSession = {
    userId: generateUserId(),
    userType,
    email: credentials.email || credentials.username || undefined,
    iat: Date.now(),
  };

  const token = encodeToken(session);

  // Store in localStorage (mimics storing JWT in httpOnly cookie)
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
  }

  return {
    token,
    payload: session,
  };
}
```

**What Happens**:
1. Creates a `UserSession` object with userId, userType, email, and timestamp
2. Encodes the session into a JWT-like token
3. Stores both the token and decoded session in localStorage
4. Returns the token and session payload

**Why Two Storage Keys?**
- `auth_token`: JWT-like string (for decoding/validation)
- `auth_session`: Plain JSON (for fast access without decoding)

**Why It Matters**: This creates a persistent session that survives browser refreshes and provides both fast access (session) and validation capability (token).

---

### Step 2: Token Encoding

**Problem**: We need a structured, standardized way to represent user session data that mimics real JWT tokens for easy backend integration.

**Solution**: Encode the session into a JWT-like format with three parts: header, payload, and signature.

**Code Example**:

```19:26:lib/auth-utils.ts
export function encodeToken(payload: UserSession): string {
  const header = btoa(JSON.stringify(JWT_HEADER));
  const encodedPayload = btoa(JSON.stringify(payload));
  // Mock signature - in production, this would be HMAC-SHA256
  const signature = btoa(`mock-signature-${payload.userId}-${payload.iat}`);
  
  return `${header}.${encodedPayload}.${signature}`;
}
```

**What Happens**:
1. Creates a header with algorithm and type (mimics real JWT header)
2. Base64-encodes the session payload
3. Creates a mock signature (in production, this would be HMAC-SHA256)
4. Combines them with dots: `header.payload.signature`

**Token Format Example**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzE3MDAwMDAwMDAwX2FiYzEyMyIsInVzZXJUeXBlIjoiYnV5ZXIiLCJpYXQiOjE3MDAwMDAwMDAwfQ.mock-signature-user_1700000000000_abc123-1700000000000
```

**Why It Matters**: This format matches real JWT tokens, so when we connect to a backend, we can easily swap in real JWT encoding/decoding without changing how tokens are used throughout the app.

---

### Step 3: Session Storage

**Problem**: We need to persist authentication data across page reloads and browser sessions, but localStorage can only store strings.

**Solution**: Store both the encoded token (for validation) and the decoded session (for fast access) in localStorage.

**Code Example**:

```49:53:lib/auth.ts
  // Store in localStorage (mimics storing JWT in httpOnly cookie)
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
  }
```

**Storage Keys**:
- `auth_token`: JWT-like token string
- `auth_session`: JSON string of the session object

**Why Two Storage Keys?**
- **Fast Access**: Reading `auth_session` is faster than decoding the token
- **Validation**: The token can be validated/decoded if the session is corrupted
- **Backend Ready**: When backend provides real JWTs, we can validate them server-side

**Why It Matters**: This dual-storage approach provides both performance (fast reads) and reliability (can recover from corrupted session data).

---

### Step 4: Session Retrieval

**Problem**: When the app loads, we need to quickly retrieve the user's session, but we also need fallback mechanisms if data is corrupted or missing.

**Solution**: Try multiple retrieval strategies in order of speed: stored session → decode token → migrate legacy data.

**Code Example**:

```105:142:lib/auth.ts
export function getSession(): UserSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Try to get from stored session first (faster)
  const storedSession = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
  if (storedSession) {
    try {
      const session = JSON.parse(storedSession) as UserSession;
      // Validate session structure
      if (session.userId && session.userType && session.iat) {
        return session;
      }
    } catch (error) {
      // Invalid JSON, fall through to token decoding
    }
  }

  // Fallback: decode from token
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    const decoded = decodeToken(token);
    if (decoded) {
      // Update stored session for faster access next time
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(decoded));
      return decoded;
    }
  }

  // Migration: try to migrate from legacy userType
  const migratedSession = migrateLegacyUserType();
  if (migratedSession) {
    return migratedSession;
  }

  return null;
}
```

**Retrieval Strategy**:
1. **Fast Path**: Read `auth_session` directly (no decoding needed)
2. **Fallback**: Decode `auth_token` if session is missing/corrupted
3. **Migration**: Convert old `userType` localStorage to new format
4. **Return null**: If no session exists

**Why It Matters**: This multi-tier approach ensures:
- **Performance**: Fast reads for normal cases
- **Reliability**: Can recover from data corruption
- **Backward Compatibility**: Automatically migrates old data

---

### Step 5: Token Decoding

**Problem**: When we only have the token string, we need to extract the user session data from it.

**Solution**: Split the token, decode the payload section, and validate the structure.

**Code Example**:

```32:50:lib/auth-utils.ts
export function decodeToken(token: string): UserSession | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const decodedPayload = JSON.parse(atob(parts[1])) as UserSession;
    
    // Basic validation
    if (!decodedPayload.userId || !decodedPayload.userType || !decodedPayload.iat) {
      return null;
    }

    return decodedPayload;
  } catch (error) {
    return null;
  }
}
```

**What Happens**:
1. Split token by dots (should have 3 parts: header.payload.signature)
2. Decode the payload (second part) from base64
3. Parse JSON to get UserSession object
4. Validate required fields exist
5. Return null if any step fails

**Why It Matters**: This provides a reliable way to extract user data from tokens, which is essential for:
- Recovering from corrupted session data
- Validating tokens from external sources (future backend)
- Debugging authentication issues

---

### Step 6: Context Integration

**Problem**: Components throughout the app need access to user type, but passing props through every component (prop drilling) is messy and error-prone.

**Solution**: Use React Context to provide user state globally, accessible via the `useUser()` hook.

**Code Example**:

```18:48:components/user-context.tsx
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userType, setUserTypeState] = useState<UserType>("financial_institution");
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from auth service session
  useEffect(() => {
    const session = getSession();
    if (session) {
      setUserTypeState(session.userType);
    }
    setIsLoading(false);
  }, []);

  // Update user type via auth service
  const setUserType = async (type: UserType) => {
    try {
      await updateUserType(type);
      setUserTypeState(type);
    } catch (error) {
      console.error("Failed to update user type:", error);
      // Fallback: still update local state even if auth service fails
      setUserTypeState(type);
    }
  };

  return (
    <UserContext.Provider value={{ userType, setUserType, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}
```

**What Happens**:
1. On mount, retrieves session from auth service
2. Updates local state with userType from session
3. Provides `userType`, `setUserType`, and `isLoading` to all children
4. Any component can access user state via `useUser()` hook

**Usage in Components**:

```typescript
const { userType, setUserType } = useUser();

if (userType === "buyer") {
  return <BuyerDashboard />;
}
```

**Why It Matters**: 
- **No Prop Drilling**: Components don't need to pass userType through multiple levels
- **Global Access**: Any component can access user state
- **Reactive**: Components automatically re-render when userType changes
- **Loading State**: Components know when session is being loaded

---

### Step 7: User Type Updates

**Problem**: Users need to switch between different user types (buyer, supplier, financial_institution), and this change needs to persist across page reloads.

**Solution**: Update the session with the new userType, regenerate the token, and update both storage keys.

**Code Example**:

```150:177:lib/auth.ts
export async function updateUserType(
  newUserType: UserType
): Promise<void> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 50));

  const currentSession = getSession();
  if (!currentSession) {
    throw new Error("No active session found");
  }

  const updatedSession: UserSession = {
    ...currentSession,
    userType: newUserType,
    iat: Date.now(), // Update issued at time
  };

  const token = encodeToken(updatedSession);

  // Update localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(
      STORAGE_KEYS.AUTH_SESSION,
      JSON.stringify(updatedSession)
    );
  }
}
```

**What Happens**:
1. Get current session (throws error if no session exists)
2. Create updated session with new userType
3. Update timestamp (`iat`) to reflect when change occurred
4. Regenerate token with new session data
5. Update both storage keys

**Why It Matters**: 
- **Persistence**: Changes survive page reloads
- **Consistency**: Both token and session are updated together
- **Timestamp**: `iat` field tracks when the change occurred (useful for auditing)

---

### Step 8: Legacy Migration

**Problem**: Existing users have `userType` stored in the old format (`localStorage.getItem("userType")`), and we need to migrate them to the new auth system without breaking their experience.

**Solution**: Automatically detect old format and convert it to the new session structure.

**Code Example**:

```65:97:lib/auth.ts
function migrateLegacyUserType(): UserSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const legacyUserType = localStorage.getItem(STORAGE_KEYS.LEGACY_USER_TYPE);
  if (
    legacyUserType &&
    (legacyUserType === "buyer" ||
      legacyUserType === "supplier" ||
      legacyUserType === "financial_institution")
  ) {
    // Create a session from legacy userType
    const session: UserSession = {
      userId: generateUserId(),
      userType: legacyUserType as UserType,
      iat: Date.now(),
    };

    const token = encodeToken(session);

    // Store in new format
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));

    // Remove legacy key
    localStorage.removeItem(STORAGE_KEYS.LEGACY_USER_TYPE);

    return session;
  }

  return null;
}
```

**What Happens**:
1. Check if old `userType` key exists in localStorage
2. Validate it's a valid userType value
3. Create new session structure with the old userType
4. Store in new format (token + session)
5. Remove old key to prevent re-migration

**When It Runs**: Called automatically by `getSession()` if no new session exists.

**Why It Matters**:
- **Zero Downtime**: Users don't need to sign in again
- **Automatic**: Happens transparently on first app load
- **One-Time**: Old key is removed after migration
- **Backward Compatible**: Supports existing users seamlessly

---

### Step 9: Sign Out

**Problem**: When users sign out, we need to completely clear their authentication data from localStorage.

**Solution**: Remove both storage keys to ensure no session data remains.

**Code Example**:

```184:189:lib/auth.ts
export function signOut(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  }
}
```

**What Happens**:
1. Removes `auth_token` from localStorage
2. Removes `auth_session` from localStorage
3. Next `getSession()` call will return `null`

**Why It Matters**:
- **Security**: Ensures no authentication data persists after sign out
- **Clean State**: App will treat user as unauthenticated
- **Simple**: One function call clears everything

---

## Architecture Overview

### Data Flow Diagram

```
┌─────────────────┐
│  User Signs In  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   signIn()      │ Creates UserSession
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  encodeToken()  │ Creates JWT-like token
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  localStorage   │ Stores: auth_token + auth_session
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  App Reloads    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UserProvider   │ Calls getSession()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  getSession()   │ Reads from localStorage
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  useUser()      │ Components access userType
└─────────────────┘
```

### Component Relationships

```
app/layout.tsx
  └── UserProvider (provides global user state)
      └── All pages and components
          └── useUser() hook (accesses user state)
```

### Storage Structure

```
localStorage:
├── auth_token: "eyJhbGci...payload...signature"
└── auth_session: '{"userId":"...","userType":"buyer","iat":1700000000000}'
```

---

## Integration Guide

### Using Authentication in Components

#### Basic Usage

```typescript
import { useUser } from "@/components/user-context";

export default function MyComponent() {
  const { userType, isLoading } = useUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (userType === "buyer") {
    return <BuyerContent />;
  }

  return <OtherContent />;
}
```

#### Real Example from Codebase

```9:20:app/(dashboard)/home/page.tsx
export default function HomePage() {
  const { userType } = useUser();

  if (userType === "buyer") {
    return <BuyerDashboard />;
  }

  if (userType === "supplier") {
    return <SupplierDashboard />;
  }

  return <FinancialInstitutionDashboard />;
}
```

### Signing In

#### Regular Sign-In Flow

```typescript
import { signIn } from "@/lib/auth";

async function handleSignIn() {
  try {
    await signIn(
      { username, password },
      "financial_institution"
    );
    window.location.href = "/home";
  } catch (error) {
    // Handle error
  }
}
```

#### Password Sign-In Flow

```typescript
import { signIn } from "@/lib/auth";

async function handlePasswordSignIn() {
  await signIn({ password }, "buyer");
  window.location.href = "/home";
}
```

### Updating User Type

```typescript
import { useUser } from "@/components/user-context";

function UserTypeSwitcher() {
  const { userType, setUserType } = useUser();

  return (
    <select value={userType} onChange={(e) => setUserType(e.target.value)}>
      <option value="buyer">Buyer</option>
      <option value="supplier">Supplier</option>
      <option value="financial_institution">Financial Institution</option>
    </select>
  );
}
```

### Checking Authentication Status

```typescript
import { isAuthenticated, getSession } from "@/lib/auth";

// Simple check
if (isAuthenticated()) {
  // User is logged in
}

// Get full session
const session = getSession();
if (session) {
  console.log(session.userType); // "buyer" | "supplier" | "financial_institution"
  console.log(session.userId);    // "user_1700000000000_abc123"
}
```

### Signing Out

```typescript
import { signOut } from "@/lib/auth";

function handleSignOut() {
  signOut();
  window.location.href = "/sign-in";
}
```

---

## Migration to Backend

### Overview

When connecting to a real backend, you only need to modify `lib/auth.ts`. Components using `useUser()` or calling auth functions won't need changes.

### Step-by-Step Migration

#### 1. Update `signIn()` Function

**Current (localStorage)**:
```typescript
export async function signIn(credentials, userType) {
  const session = { userId: generateUserId(), userType, iat: Date.now() };
  const token = encodeToken(session);
  localStorage.setItem("auth_token", token);
  return { token, payload: session };
}
```

**Future (API call)**:
```typescript
export async function signIn(credentials, userType) {
  const response = await fetch("/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credentials, userType }),
  });
  
  const { token, user } = await response.json();
  
  // Token stored in httpOnly cookie by backend
  // Just store user data in localStorage for fast access
  localStorage.setItem("auth_session", JSON.stringify(user));
  
  return { token, payload: user };
}
```

#### 2. Update `getSession()` Function

**Current (localStorage)**:
```typescript
export function getSession() {
  const stored = localStorage.getItem("auth_session");
  return stored ? JSON.parse(stored) : null;
}
```

**Future (API call or cookie)**:
```typescript
export async function getSession() {
  // Option 1: Decode JWT from httpOnly cookie (server-side)
  // Option 2: Call API endpoint
  const response = await fetch("/api/auth/session");
  const { user } = await response.json();
  return user;
}
```

#### 3. Update `updateUserType()` Function

**Current (localStorage)**:
```typescript
export async function updateUserType(newUserType) {
  const session = getSession();
  const updated = { ...session, userType: newUserType };
  localStorage.setItem("auth_session", JSON.stringify(updated));
}
```

**Future (API call)**:
```typescript
export async function updateUserType(newUserType) {
  const response = await fetch("/api/auth/user-type", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userType: newUserType }),
  });
  
  const { user } = await response.json();
  localStorage.setItem("auth_session", JSON.stringify(user));
}
```

#### 4. Update `signOut()` Function

**Current (localStorage)**:
```typescript
export function signOut() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_session");
}
```

**Future (API call)**:
```typescript
export async function signOut() {
  await fetch("/api/auth/signout", { method: "POST" });
  localStorage.removeItem("auth_session");
}
```

### What Stays the Same

- **Components**: No changes needed - they use the same `useUser()` hook
- **Type Definitions**: `UserType`, `UserSession` interfaces stay the same
- **Context API**: `UserProvider` and `useUser()` work exactly the same
- **Function Signatures**: All auth functions keep the same parameters and return types

### Benefits of This Approach

1. **Minimal Changes**: Only `lib/auth.ts` needs updates
2. **Type Safety**: TypeScript ensures compatibility
3. **Gradual Migration**: Can migrate one function at a time
4. **Testing**: Easy to test both localStorage and API implementations

---

## Summary

The authentication system provides:

- **JWT-like Token Structure**: Mimics real JWTs for easy backend integration
- **Persistent Sessions**: Survives page reloads via localStorage
- **Global State Access**: React Context provides user state everywhere
- **Backward Compatibility**: Automatically migrates old data
- **Easy Migration**: Only one file needs changes for backend connection
- **Type Safety**: Full TypeScript support throughout

The system solves the problem of managing user authentication without a backend, while making it trivial to connect to a real backend later.

