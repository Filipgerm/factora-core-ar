# Home Page Guide: Learning React, Next.js, and CSS Through Example

## Table of Contents

1. [Introduction](#introduction)
2. [Understanding the Entry Point](#understanding-the-entry-point)
3. [React Concepts Deep Dive](#react-concepts-deep-dive)
4. [Next.js App Router Concepts](#nextjs-app-router-concepts)
5. [Dashboard Components Structure](#dashboard-components-structure)
6. [CSS and Tailwind CSS Concepts](#css-and-tailwind-css-concepts)
7. [Code Walkthrough Examples](#code-walkthrough-examples)
8. [Common Patterns and Best Practices](#common-patterns-and-best-practices)
9. [Visual Diagrams](#visual-diagrams)
10. [Exercises and Learning Path](#exercises-and-learning-path)

---

## Introduction

### What This Guide Is About

This guide uses the home page (`app/(dashboard)/home/page.tsx`) as a practical example to teach you React, Next.js, CSS, and Tailwind CSS concepts. If you're a programmer familiar with JavaScript but new to frontend frameworks, this guide will help you understand how modern web applications are built.

### Why the Home Page?

The home page is an excellent learning example because it demonstrates:

- **Conditional rendering** - showing different content based on user type
- **Component composition** - building complex UIs from smaller pieces
- **State management** - sharing data across components
- **Styling patterns** - using Tailwind CSS for responsive design
- **Next.js routing** - understanding the App Router system

### Tech Stack Overview

Before diving in, let's understand what technologies we're working with:

**React** - A JavaScript library for building user interfaces. React lets you build UI components that automatically update when data changes.

**Next.js** - A framework built on top of React that adds:

- Server-side rendering
- File-based routing
- Optimized performance
- Built-in CSS support

**TypeScript** - JavaScript with type checking. It helps catch errors before runtime and makes code more maintainable.

**Tailwind CSS** - A utility-first CSS framework. Instead of writing custom CSS, you use pre-built utility classes directly in your HTML/JSX.

### File Structure

Here's how the home page fits into the project structure:

```
frontend/
├── app/
│   └── (dashboard)/
│       ├── layout.tsx          # Wraps all dashboard pages
│       ├── globals.css          # Global styles
│       └── home/
│           └── page.tsx         # Our home page (this file!)
├── components/
│   ├── user-context.tsx         # Provides user state globally
│   └── dashboards/
│       ├── supplier-dashboard.tsx
│       ├── buyer-dashboard.tsx
│       └── financial-institution-dashboard.tsx
└── docs/
    └── HOME_PAGE_GUIDE.md       # This file
```

The `(dashboard)` folder is a **route group** in Next.js - the parentheses mean it doesn't affect the URL structure, but it groups related routes together.

---

## Understanding the Entry Point

Let's start by examining the actual home page code:

```1:22:app/(dashboard)/home/page.tsx
"use client";

import { useUser } from "@/components/user-context";
import { FinancialInstitutionDashboard } from "@/components/dashboards/financial-institution-dashboard";
import { SupplierDashboard } from "@/components/dashboards/supplier-dashboard";
import { BuyerDashboard } from "@/components/dashboards/buyer-dashboard";

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

This is a complete React component! Let's break it down line by line.

### React Component Basics

#### What is a Component?

A React component is a JavaScript function that returns JSX (JavaScript XML). Think of it as a reusable piece of UI. In this case, `HomePage` is a component that decides which dashboard to show.

**Key characteristics:**

- Starts with a capital letter (`HomePage`, not `homePage`)
- Returns JSX (the HTML-like syntax)
- Can be imported and used like an HTML tag (`<HomePage />`)

#### JSX Syntax

JSX looks like HTML but it's actually JavaScript. Here's what's happening:

```javascript
return <BuyerDashboard />;
```

This is equivalent to:

```javascript
return React.createElement(BuyerDashboard, null);
```

But JSX is much more readable! The `<BuyerDashboard />` syntax means "render the BuyerDashboard component here."

**JSX Rules:**

- Must return a single parent element (or use fragments `<>...</>`)
- Use `className` instead of `class` (because `class` is a reserved word in JavaScript)
- Use camelCase for attributes (`onClick`, not `onclick`)
- Embed JavaScript expressions with `{}`

### The "use client" Directive

```javascript
"use client";
```

This tells Next.js that this component needs to run in the browser (client-side) rather than on the server.

**Why do we need it?**

- The component uses React hooks (`useUser()`)
- Hooks can only run in client components
- Client components can use browser APIs and handle user interactions

**Server vs Client Components:**

- **Server Components** (default): Render on the server, can't use hooks or browser APIs
- **Client Components** (`"use client"`): Render in the browser, can use hooks and event handlers

### Conditional Rendering

The home page uses conditional rendering to show different dashboards:

```javascript
if (userType === "buyer") {
  return <BuyerDashboard />;
}

if (userType === "supplier") {
  return <SupplierDashboard />;
}

return <FinancialInstitutionDashboard />;
```

**How it works:**

1. Check if `userType` is `"buyer"` → show buyer dashboard
2. If not, check if it's `"supplier"` → show supplier dashboard
3. Otherwise, show the financial institution dashboard (default)

**Why this pattern?**

- Early returns make the code clear and easy to read
- Each condition is independent
- The default case handles any other scenario

**Alternative syntax** (ternary operator):

```javascript
return userType === "buyer" ? (
  <BuyerDashboard />
) : userType === "supplier" ? (
  <SupplierDashboard />
) : (
  <FinancialInstitutionDashboard />
);
```

Both work, but the `if/return` pattern is often clearer for multiple conditions.

### Hooks Introduction

```javascript
const { userType } = useUser();
```

This line uses a **React hook** called `useUser()`. Hooks are special functions that let you "hook into" React features.

**What's happening:**

- `useUser()` is a custom hook that gives us access to user information
- We use **destructuring** to extract `userType` from the returned object
- `userType` will be `"buyer"`, `"supplier"`, or `"financial_institution"`

**Hook Rules:**

- Only call hooks at the top level of your component (not inside loops or conditions)
- Only call hooks from React components or custom hooks
- Hooks start with `use` (like `useState`, `useEffect`, `useUser`)

### Component Composition

Notice how `HomePage` doesn't render any HTML directly - it composes other components:

```javascript
return <SupplierDashboard />;
```

This is **component composition** - building complex UIs by combining simpler components. It's like building with LEGO blocks:

```
HomePage
  └── SupplierDashboard
      ├── SupplierHeader
      ├── QuickActions
      └── StatusNotifications
```

Each component has a single responsibility, making the code easier to understand and maintain.

---

## React Concepts Deep Dive

Now let's explore the React concepts used in the home page in more detail.

### State Management

State is data that can change over time. In our home page, `userType` is state that determines which dashboard to show.

**How state flows:**

```
UserContext (stores userType)
    ↓
useUser() hook (reads userType)
    ↓
HomePage component (uses userType)
    ↓
Conditional rendering (shows correct dashboard)
```

The state is stored in `UserContext` and accessed through the `useUser()` hook. This is called **lifting state up** - storing state in a parent component (or context) so multiple children can access it.

### Context API

Let's look at how `UserContext` works:

```1:51:components/user-context.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type UserType = "buyer" | "supplier" | "financial_institution";

interface UserContextType {
  userType: UserType;
  setUserType: (type: UserType) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Initialize state directly from localStorage to avoid race condition
  // Default to financial_institution except when coming from sign-in/password
  const [userType, setUserType] = useState<UserType>(() => {
    if (typeof window !== "undefined") {
      const savedUserType = localStorage.getItem("userType") as UserType;
      if (
        savedUserType &&
        (savedUserType === "buyer" ||
          savedUserType === "supplier" ||
          savedUserType === "financial_institution")
      ) {
        return savedUserType;
      }
    }
    return "financial_institution"; // Default to financial_institution
  });

  // Save user type to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("userType", userType);
  }, [userType]);

  return (
    <UserContext.Provider value={{ userType, setUserType }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
```

**Breaking it down:**

1. **`createContext`** - Creates a context object that can hold shared state
2. **`UserProvider`** - A component that provides the context value to all children
3. **`useState`** - React hook that manages component state
4. **`useEffect`** - React hook that runs side effects (like saving to localStorage)
5. **`useUser`** - Custom hook that accesses the context

**Why use Context?**

- Avoids "prop drilling" (passing props through many components)
- Makes state available to any component in the tree
- Centralizes state management

**The flow:**

```
UserProvider wraps the app
    ↓
Provides { userType, setUserType } via Context
    ↓
Any component can call useUser() to access it
    ↓
HomePage uses useUser() to get userType
```

### Component Props

Props are how you pass data from parent to child components. In our home page, we're not passing props, but let's see how it works in the dashboard components:

```javascript
<SupplierDashboard />
```

This component receives no props, but if it did, it would look like:

```javascript
<SupplierDashboard title="My Dashboard" count={5} />
```

And the component would receive them like:

```javascript
function SupplierDashboard({ title, count }) {
  return (
    <div>
      {title}: {count}
    </div>
  );
}
```

**Props are:**

- **Read-only** - child components can't modify props
- **One-way** - data flows from parent to child
- **Type-safe** - TypeScript helps catch prop errors

### Event Handlers

While the home page doesn't have event handlers, the dashboard components do. Here's an example from `SupplierDashboard`:

```javascript
const handleCreditCheck = () => router.push("/send-link");
```

**What's happening:**

- `handleCreditCheck` is a function that runs when triggered
- `router.push()` navigates to a new page (Next.js routing)
- This function is passed to child components as a prop

**Usage in child component:**

```javascript
<QuickActions onCreditCheck={handleCreditCheck} />
```

The child component can then call it:

```javascript
<Button onClick={onCreditCheck}>Add Customer</Button>
```

**Event handler pattern:**

1. Define handler function in parent
2. Pass it to child as prop (usually prefixed with `on`)
3. Child calls it when event occurs (like button click)

---

## Next.js App Router Concepts

Next.js uses a file-based routing system. Understanding how files map to URLs is crucial.

### File-based Routing

In Next.js App Router, the file structure determines the URL structure:

```
app/
└── (dashboard)/
    └── home/
        └── page.tsx  →  /home
```

**Key rules:**

- `page.tsx` files create routes
- Folders create URL segments
- `(dashboard)` is a route group (doesn't affect URL)

**More examples:**

```
app/about/page.tsx          → /about
app/products/page.tsx        → /products
app/products/[id]/page.tsx   → /products/123 (dynamic route)
```

### Route Groups

The `(dashboard)` folder is a **route group**. Parentheses mean:

- ✅ Groups related routes together
- ✅ Can share a layout (`layout.tsx`)
- ❌ Does NOT affect the URL

So `app/(dashboard)/home/page.tsx` creates the route `/home`, not `/(dashboard)/home`.

**Why use route groups?**

- Organize routes logically
- Share layouts between routes
- Keep URL structure clean

### Layout System

Every `page.tsx` is wrapped by its nearest `layout.tsx`. Let's look at the dashboard layout:

```1:40:app/(dashboard)/layout.tsx
"use client";

import "./globals.css";
import { Suspense } from "react";
import { BusinessSidebar } from "@/components/business-sidebar";
import { BuyerSidebar } from "@/components/buyer-sidebar";
import { useUser } from "@/components/user-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userType } = useUser();

  const renderSidebar = () => {
    if (userType === "buyer") {
      return <BuyerSidebar />;
    }
    return <BusinessSidebar />;
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {renderSidebar()}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Suspense
          fallback={
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
              Loading...
            </div>
          }
        >
          {children}
        </Suspense>
      </div>
    </div>
  );
}
```

**How layouts work:**

1. `layout.tsx` wraps all pages in that folder
2. The `{children}` prop is where the page content goes
3. Layouts can be nested (parent layout wraps child layout)

**Visual structure:**

```
DashboardLayout
  ├── Sidebar (conditional)
  └── children (our HomePage)
      └── Dashboard component
```

**Benefits:**

- Shared UI (like sidebars) without repeating code
- Consistent structure across pages
- Can wrap with providers, error boundaries, etc.

### Client vs Server Components

**Server Components (default):**

- Render on the server
- Can't use hooks or browser APIs
- Faster initial load
- Can access databases directly

**Client Components (`"use client"`):**

- Render in the browser
- Can use hooks (`useState`, `useEffect`, etc.)
- Can handle user interactions
- Can use browser APIs (`localStorage`, `window`, etc.)

**When to use each:**

- **Server Component**: Static content, data fetching, SEO-critical content
- **Client Component**: Interactive elements, hooks, browser APIs

Our home page is a client component because it uses the `useUser()` hook.

---

## Dashboard Components Structure

Now let's explore the actual dashboard components that get rendered. We'll focus on `SupplierDashboard` as our main example.

### SupplierDashboard Overview

```31:249:components/dashboards/supplier-dashboard.tsx
export function SupplierDashboard() {
  const router = useRouter();
  const { containerRef, animateOnMount } = useChartAnimation();
  const { userType } = useUser();

  useEffect(() => {
    animateOnMount(".home-header", { delay: 0.05 });
    animateOnMount(".home-action", { delay: 0.1, stagger: 0.1 });
    animateOnMount(".home-notif", { delay: 0.25, stagger: 0.05 });
  }, [animateOnMount]);

  const handleCreditCheck = () => router.push("/send-link");
  const handleAICopilot = () => router.push("/ai-copilot");

  const handleStatusClick = (notification: StatusNotification) => {
    if (notification.customerVatNumber) {
      router.push(`/customers/${notification.customerVatNumber}?tab=summary`);
    }
  };

  const handleAlertClick = (notification: AlertNotification) => {
    if (notification.customerVatNumber) {
      router.push(`/alerts?customer=${notification.customerVatNumber}`);
    }
  };

  const handleRequestClick = (notification: RequestNotification) => {
    if (notification.customerVatNumber) {
      router.push(`/financing?customer=${notification.customerVatNumber}`);
    }
  };

  // Convert FinancingRequest to RequestNotification
  const convertFinancingRequestToNotification = useCallback(
    (request: FinancingRequest): RequestNotification => ({
      id: request.id,
      kind: "request",
      customerId: request.vatNumber,
      businessName: request.businessName,
      createdAt: request.createdAt,
      read: false,
      requestType: request.requestType,
      amount: request.totalAmount,
      invoiceCount: request.invoiceCount,
      customerVatNumber: request.vatNumber,
      details: request.providerName || undefined,
    }),
    []
  );

  const {
    statusEvents,
    alertEvents,
    requestEvents: baseRequestEvents,
  } = useMemo(
    () => buildNotifications(PREVIOUS_CUSTOMERS_DATA, CUSTOMERS_DATA),
    []
  );

  // Read financing requests from localStorage
  const [financingRequests, setFinancingRequests] = useState<
    FinancingRequest[]
  >([]);

  useEffect(() => {
    const loadFinancingRequests = () => {
      try {
        const requests = getFinancingRequests();
        setFinancingRequests(requests);
      } catch (error) {
        console.error("Failed to load financing requests:", error);
      }
    };

    // Load on mount
    loadFinancingRequests();

    // Listen for custom events
    const handleFinancingRequestCreated = () => {
      loadFinancingRequests();
    };

    window.addEventListener(
      "financingRequestCreated",
      handleFinancingRequestCreated
    );

    // Note: storage events don't fire for sessionStorage changes, so we rely on custom events only

    return () => {
      window.removeEventListener(
        "financingRequestCreated",
        handleFinancingRequestCreated
      );
    };
  }, []);

  // Merge base request events with financing requests from localStorage
  const requestEvents = useMemo(() => {
    const financingRequestNotifications = financingRequests.map(
      convertFinancingRequestToNotification
    );
    const allRequests = [
      ...baseRequestEvents,
      ...financingRequestNotifications,
    ];
    // Sort by createdAt, most recent first
    return allRequests.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [
    baseRequestEvents,
    financingRequests,
    convertFinancingRequestToNotification,
  ]);

  const [notificationExpansion, setNotificationExpansion] =
    useState<NotificationExpansionState>({
      status: false,
      alerts: false,
      requests: false,
    });

  const DEFAULT_LIMITS = {
    status: 3,
    alerts: 3,
    requests: 3,
  };

  // Totals from data
  const totals: NotificationBadgeCounts = {
    status: statusEvents.length,
    alerts: alertEvents.length,
    requests: requestEvents.length,
  };

  const {
    status: statusList,
    alerts: alertList,
    requests: requestList,
  } = getExpandedLists(
    { status: statusEvents, alerts: alertEvents, requests: requestEvents },
    DEFAULT_LIMITS,
    notificationExpansion
  );

  const badgeCounts = getBadgeCounts(totals);

  const canExpand = {
    status: totals.status > DEFAULT_LIMITS.status,
    alerts: totals.alerts > DEFAULT_LIMITS.alerts,
    requests: totals.requests > DEFAULT_LIMITS.requests,
  };

  return (
    <main
      className="flex-1 overflow-y-auto bg-slate-50 min-h-screen"
      ref={containerRef}
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <SupplierHeader />

        <QuickActions
          onCreditCheck={handleCreditCheck}
          onAICopilot={handleAICopilot}
        />

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            Notifications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusNotifications
              items={statusList as StatusNotification[]}
              badgeCount={badgeCounts.status}
              canExpand={canExpand.status}
              expanded={notificationExpansion.status}
              onToggle={() =>
                setNotificationExpansion((prev) => ({
                  ...prev,
                  status: !prev.status,
                }))
              }
              onClick={handleStatusClick}
            />

            <AlertsNotifications
              items={alertList as AlertNotification[]}
              badgeCount={badgeCounts.alerts}
              canExpand={canExpand.alerts}
              expanded={notificationExpansion.alerts}
              onToggle={() =>
                setNotificationExpansion((prev) => ({
                  ...prev,
                  alerts: !prev.alerts,
                }))
              }
              onClick={handleAlertClick}
            />

            {userType !== "supplier" && (
              <RequestsNotifications
                items={requestList as RequestNotification[]}
                badgeCount={badgeCounts.requests}
                canExpand={canExpand.requests}
                expanded={notificationExpansion.requests}
                onToggle={() =>
                  setNotificationExpansion((prev) => ({
                    ...prev,
                    requests: !prev.requests,
                  }))
                }
                onClick={handleRequestClick}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
```

### Key Concepts in SupplierDashboard

#### 1. Multiple Hooks

```javascript
const router = useRouter();
const { containerRef, animateOnMount } = useChartAnimation();
const { userType } = useUser();
```

This component uses three different hooks:

- `useRouter()` - Next.js hook for navigation
- `useChartAnimation()` - Custom hook for animations
- `useUser()` - Custom hook for user context

**Hook order matters:** Always call hooks in the same order (React's Rules of Hooks).

#### 2. useEffect Hook

```javascript
useEffect(() => {
  animateOnMount(".home-header", { delay: 0.05 });
  // ...
}, [animateOnMount]);
```

`useEffect` runs after the component renders. It's used for:

- Side effects (animations, API calls, subscriptions)
- Cleanup (removing event listeners)

**Dependency array `[animateOnMount]`:**

- Empty `[]` = run once on mount
- `[value]` = run when `value` changes
- No array = run on every render (usually avoid this)

#### 3. useState Hook

```javascript
const [financingRequests, setFinancingRequests] = useState<FinancingRequest[]>([]);
```

`useState` manages component state:

- First value (`financingRequests`) = current state
- Second value (`setFinancingRequests`) = function to update state
- Initial value = `[]` (empty array)

**Updating state:**

```javascript
setFinancingRequests([...financingRequests, newRequest]);
```

Never mutate state directly - always create a new value!

#### 4. useMemo Hook

```javascript
const requestEvents = useMemo(() => {
  // expensive calculation
  return allRequests.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}, [
  baseRequestEvents,
  financingRequests,
  convertFinancingRequestToNotification,
]);
```

`useMemo` caches expensive calculations:

- Only recalculates when dependencies change
- Improves performance by avoiding unnecessary work

#### 5. useCallback Hook

```javascript
const convertFinancingRequestToNotification = useCallback(
  (request: FinancingRequest): RequestNotification => ({
    // ...
  }),
  []
);
```

`useCallback` memoizes functions:

- Returns the same function reference unless dependencies change
- Useful when passing functions as props (prevents unnecessary re-renders)

### Component Hierarchy

Here's the visual structure of `SupplierDashboard`:

```
SupplierDashboard
├── main (container)
│   └── div (content wrapper)
│       ├── SupplierHeader
│       ├── QuickActions
│       │   ├── Card (Credit Check)
│       │   └── Card (AI Copilot)
│       └── Notifications Section
│           ├── StatusNotifications
│           ├── AlertsNotifications
│           └── RequestsNotifications (conditional)
```

Each component has a single responsibility, making the code maintainable.

### BuyerDashboard vs SupplierDashboard

`BuyerDashboard` has a different structure:

```139:178:components/dashboards/buyer-dashboard.tsx
  return (
    <main
      className="flex-1 overflow-y-auto bg-white min-h-screen"
      ref={containerRef}
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Welcome Header */}
        <div className="mb-8 bd-header">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {customer.name}
          </h1>
          <p className="text-gray-600">
            Here's an overview of your {customer.businessName} dashboard
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <CreditScoreCard
            creditScore={creditScore}
            creditScores={creditScores}
          />
          <CreditLimitCard creditLimit={creditLimit} status={customer.status} />
          <ConnectedServicesCard
            connectedServices={customer.connectedServices}
          />
          <ShareProfileCard
            banks={banks}
            insuranceCompanies={insuranceCompanies}
          />
        </div>

        <Notifications
          acceptedRequests={acceptedRequests}
          rejectedRequests={rejectedRequests}
        />
      </div>
    </main>
  );
```

**Key differences:**

- Shows personalized welcome message
- Displays credit score and limit cards
- Different notification structure
- Different color scheme (`bg-white` vs `bg-slate-50`)

This demonstrates how the same page structure can render completely different UIs based on user type!

---

## CSS and Tailwind CSS Concepts

Now let's understand how styling works in this project. We use Tailwind CSS, a utility-first CSS framework.

### Utility-First CSS

Traditional CSS:

```css
/* styles.css */
.dashboard-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
}
```

Tailwind CSS:

```html
<div class="max-w-7xl mx-auto p-8"></div>
```

**Benefits:**

- No need to write custom CSS
- Consistent spacing and sizing
- Easy to see styles in markup
- Smaller bundle size (unused styles are removed)

### Responsive Design

Tailwind uses breakpoint prefixes for responsive design:

```javascript
className = "p-4 sm:p-6 lg:p-8";
```

**Breakpoints:**

- `sm:` - 640px and up (small tablets)
- `md:` - 768px and up (tablets)
- `lg:` - 1024px and up (desktops)
- `xl:` - 1280px and up (large desktops)

**How it works:**

- `p-4` = padding 1rem on all screens
- `sm:p-6` = padding 1.5rem on small screens and up
- `lg:p-8` = padding 2rem on large screens and up

**Example from SupplierDashboard:**

```javascript
<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
```

This means:

- Mobile: `p-4` (1rem padding)
- Small screens: `p-6` (1.5rem padding)
- Large screens: `p-8` (2rem padding)

### Layout Classes

#### Flexbox

```javascript
className = "flex h-screen bg-slate-50";
```

- `flex` - Makes container a flexbox
- `h-screen` - Height 100vh (full viewport height)
- `bg-slate-50` - Background color (light gray)

**Flex properties:**

- `flex-1` - Grow to fill available space
- `flex-col` - Stack items vertically
- `items-center` - Center items on cross-axis
- `justify-between` - Space items apart

**Example from layout:**

```javascript
<div className="flex h-screen bg-slate-50">
  {renderSidebar()}
  <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
</div>
```

This creates a sidebar + main content layout.

#### Grid

```javascript
className = "grid grid-cols-1 md:grid-cols-3 gap-6";
```

- `grid` - Makes container a grid
- `grid-cols-1` - 1 column on mobile
- `md:grid-cols-3` - 3 columns on medium screens and up
- `gap-6` - Gap between grid items (1.5rem)

**Grid example:**

```javascript
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <StatusNotifications />
  <AlertsNotifications />
  <RequestsNotifications />
</div>
```

On mobile: stacked vertically (1 column)
On desktop: side by side (3 columns)

#### Container and Centering

```javascript
className = "max-w-7xl mx-auto";
```

- `max-w-7xl` - Maximum width 80rem (1280px)
- `mx-auto` - Horizontal margin auto (centers the element)

This creates a centered container with max width.

### Spacing System

Tailwind uses a consistent spacing scale:

```
0 = 0px
1 = 0.25rem (4px)
2 = 0.5rem (8px)
4 = 1rem (16px)
6 = 1.5rem (24px)
8 = 2rem (32px)
```

**Padding:**

- `p-4` = padding all sides (1rem)
- `px-4` = padding left/right (1rem)
- `py-4` = padding top/bottom (1rem)
- `pt-4` = padding top (1rem)

**Margin:**

- `m-4` = margin all sides
- `mx-auto` = margin left/right auto (centering)
- `mb-8` = margin bottom (2rem)
- `gap-6` = gap between flex/grid items (1.5rem)

**Example from SupplierHeader:**

```javascript
<div className="home-header mb-8">
  <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
```

- `mb-8` = margin bottom 2rem (space below header)
- `mb-2` = margin bottom 0.5rem (space below title)

### Color System

Tailwind provides semantic color names:

**Slate (grays):**

- `bg-slate-50` - Very light gray background
- `text-slate-900` - Dark gray text
- `text-slate-600` - Medium gray text
- `border-slate-200` - Light gray border

**Teal (brand colors):**

- `text-teal-600` - Medium teal
- `bg-teal-100` - Light teal background
- `hover:border-teal-200` - Teal border on hover

**Example from QuickActions:**

```javascript
<Card className="flex flex-col justify-between home-action bg-white border-slate-200 hover:shadow-lg transition-all duration-200 hover:border-teal-200">
```

- `bg-white` - White background
- `border-slate-200` - Light gray border
- `hover:shadow-lg` - Large shadow on hover
- `hover:border-teal-200` - Teal border on hover

### Component Styling Examples

Let's look at real examples from the codebase:

#### SupplierHeader

```14:27:components/dashboards/supplier/SupplierHeader.tsx
export function SupplierHeader({ loading = false }: SupplierHeaderProps) {
  if (loading) return <HeaderSkeleton />;

  return (
    <div className="home-header mb-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
        Let's get started
      </h1>
      <p className="text-slate-600 text-lg">
        Welcome back! Here's an overview of your customer portfolio and quick actions.
      </p>
    </div>
  );
}
```

**Styling breakdown:**

- `home-header` - Custom class for animation targeting
- `mb-8` - Margin bottom (2rem)
- `text-3xl sm:text-4xl` - Responsive text size (larger on small screens)
- `font-bold` - Bold font weight
- `text-slate-900` - Dark text color
- `mb-2` - Margin bottom (0.5rem)
- `text-slate-600` - Medium gray text
- `text-lg` - Large text size

#### QuickActions Card

```50:76:components/dashboards/supplier/QuickActions.tsx
        <Card className="flex flex-col justify-between home-action bg-white border-slate-200 hover:shadow-lg transition-all duration-200 hover:border-teal-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-r from-teal-100 to-teal-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">
                  Credit Check New Customer
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-slate-600">
              Check customer eligibility for flexible payment options and send onboarding
              invitations.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              onClick={onCreditCheck}
              className="w-full bg-gradient-to-r from-[#2f9a8a] to-[#133b4f] hover:from-[#2a8a7a] hover:to-[#0f2d3f] text-white font-semibold py-3 rounded-lg transition-all duration-200 hover:shadow-md"
            >
              <span>Add Customer</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
```

**Key styling concepts:**

1. **Flexbox layout:**

   - `flex flex-col` - Vertical stack
   - `justify-between` - Space items apart
   - `items-center` - Center items horizontally
   - `gap-3` - Space between flex items

2. **Hover effects:**

   - `hover:shadow-lg` - Shadow on hover
   - `hover:border-teal-200` - Border color change
   - `transition-all duration-200` - Smooth transitions

3. **Gradients:**

   - `bg-gradient-to-r` - Left-to-right gradient
   - `from-teal-100 to-teal-50` - Gradient colors
   - `from-[#2f9a8a] to-[#133b4f]` - Custom color gradient

4. **Spacing:**

   - `pb-4` - Padding bottom
   - `pt-0` - No padding top
   - `mb-2` - Margin bottom
   - `ml-2` - Margin left

5. **Sizing:**
   - `w-full` - Full width
   - `h-6 w-6` - Icon size (1.5rem)
   - `py-3` - Vertical padding

### Common Tailwind Patterns

**Card pattern:**

```javascript
<Card className="bg-white border-slate-200 hover:shadow-md">
```

**Button pattern:**

```javascript
<Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
```

**Container pattern:**

```javascript
<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
```

**Grid pattern:**

```javascript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

**Flex pattern:**

```javascript
<div className="flex items-center justify-between gap-4">
```

---

## Code Walkthrough Examples

Let's do a detailed line-by-line walkthrough of key code sections.

### Home Page Complete Walkthrough

```1:22:app/(dashboard)/home/page.tsx
"use client";

import { useUser } from "@/components/user-context";
import { FinancialInstitutionDashboard } from "@/components/dashboards/financial-institution-dashboard";
import { SupplierDashboard } from "@/components/dashboards/supplier-dashboard";
import { BuyerDashboard } from "@/components/dashboards/buyer-dashboard";

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

**Line 1: `"use client"`**

- Directive telling Next.js this is a client component
- Required because we use hooks (which only work client-side)

**Line 3: `import { useUser } from "@/components/user-context"`**

- Imports the `useUser` hook from the user context file
- `@/` is an alias for the project root (configured in `tsconfig.json`)

**Lines 4-6: Dashboard imports**

- Importing the three dashboard components we might render
- Using named exports (components exported with `export function`)

**Line 8: `export default function HomePage()`**

- `export default` - Makes this the default export (Next.js requires `page.tsx` to have a default export)
- `function HomePage()` - Function component declaration
- Component name must start with capital letter (React convention)

**Line 9: `const { userType } = useUser();`**

- Calls the `useUser()` hook
- Uses destructuring to extract `userType` from the returned object
- `userType` will be `"buyer"`, `"supplier"`, or `"financial_institution"`

**Lines 11-13: First condition**

- Checks if user is a buyer
- If true, returns the BuyerDashboard component immediately
- Early return pattern - exits function here if condition is met

**Lines 15-17: Second condition**

- Checks if user is a supplier
- Only reached if first condition was false
- Returns SupplierDashboard if condition is true

**Line 19: Default return**

- If neither condition was true, return FinancialInstitutionDashboard
- This is the default/fallback case

### SupplierDashboard Key Sections

#### State Management Section

```javascript
const [financingRequests, setFinancingRequests] = useState<FinancingRequest[]>([]);
```

**Breaking it down:**

- `useState` - React hook for state management
- `<FinancingRequest[]>` - TypeScript type (array of FinancingRequest objects)
- `[]` - Initial value (empty array)
- Returns array: `[currentValue, setterFunction]`
- Destructured into `financingRequests` and `setFinancingRequests`

**Usage:**

```javascript
setFinancingRequests([...financingRequests, newRequest]);
```

- Spreads existing array (`...financingRequests`)
- Adds new item (`newRequest`)
- Creates new array (doesn't mutate original)

#### useEffect with Cleanup

```javascript
useEffect(() => {
  const loadFinancingRequests = () => {
    try {
      const requests = getFinancingRequests();
      setFinancingRequests(requests);
    } catch (error) {
      console.error("Failed to load financing requests:", error);
    }
  };

  loadFinancingRequests();

  const handleFinancingRequestCreated = () => {
    loadFinancingRequests();
  };

  window.addEventListener(
    "financingRequestCreated",
    handleFinancingRequestCreated
  );

  return () => {
    window.removeEventListener(
      "financingRequestCreated",
      handleFinancingRequestCreated
    );
  };
}, []);
```

**Step by step:**

1. **Effect function runs:**

   - Defines `loadFinancingRequests` function
   - Calls it immediately (loads data on mount)
   - Sets up event listener

2. **Event listener:**

   - Listens for custom `"financingRequestCreated"` event
   - When event fires, reloads financing requests
   - Allows other parts of app to trigger refresh

3. **Cleanup function (return):**

   - Runs when component unmounts or dependencies change
   - Removes event listener (prevents memory leaks)
   - Always clean up subscriptions!

4. **Empty dependency array `[]`:**
   - Effect runs once on mount
   - Cleanup runs on unmount
   - No dependencies = effect doesn't re-run

#### useMemo for Expensive Calculations

```javascript
const requestEvents = useMemo(() => {
  const financingRequestNotifications = financingRequests.map(
    convertFinancingRequestToNotification
  );
  const allRequests = [...baseRequestEvents, ...financingRequestNotifications];
  return allRequests.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}, [
  baseRequestEvents,
  financingRequests,
  convertFinancingRequestToNotification,
]);
```

**What's happening:**

1. **Memoization:**

   - `useMemo` caches the result
   - Only recalculates when dependencies change

2. **Transformation:**

   - Maps financing requests to notifications
   - Merges with base request events
   - Sorts by creation date (newest first)

3. **Dependencies:**
   - Recalculates when any dependency changes
   - Prevents unnecessary recalculations

**Why useMemo?**

- Sorting arrays can be expensive
- Prevents re-sorting on every render
- Improves performance

#### Conditional Rendering in JSX

```javascript
{
  userType !== "supplier" && (
    <RequestsNotifications
      items={requestList}
      // ... props
    />
  );
}
```

**How it works:**

- `&&` operator: if left side is truthy, render right side
- If `userType !== "supplier"` is true, render component
- If false, render nothing (React skips it)

**Alternative syntax:**

```javascript
{
  userType !== "supplier" ? <RequestsNotifications /> : null;
}
```

Both work, but `&&` is more concise for simple conditionals.

### SupplierHeader Component

```14:27:components/dashboards/supplier/SupplierHeader.tsx
export function SupplierHeader({ loading = false }: SupplierHeaderProps) {
  if (loading) return <HeaderSkeleton />;

  return (
    <div className="home-header mb-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
        Let's get started
      </h1>
      <p className="text-slate-600 text-lg">
        Welcome back! Here's an overview of your customer portfolio and quick actions.
      </p>
    </div>
  );
}
```

**Line 1: Function declaration**

- `export function` - Named export
- `SupplierHeader` - Component name
- `{ loading = false }` - Props with default value

**Line 2: Early return**

- If loading, show skeleton (loading state)
- Prevents rendering main content while loading

**Line 4: Container div**

- `className` - Tailwind classes (not `class` - that's reserved in JS)
- `home-header` - Custom class for animation targeting
- `mb-8` - Margin bottom

**Line 5: Heading**

- `text-3xl sm:text-4xl` - Responsive text size
- `font-bold` - Bold weight
- `text-slate-900` - Dark text color
- `mb-2` - Margin bottom

**Line 8: Paragraph**

- `text-slate-600` - Medium gray text
- `text-lg` - Large text size

### QuickActions Component

```39:105:components/dashboards/supplier/QuickActions.tsx
export function QuickActions({
  onCreditCheck,
  onAICopilot,
  loading = false,
}: QuickActionsProps) {
  if (loading) return <ActionSkeleton />;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Quick Actions</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col justify-between home-action bg-white border-slate-200 hover:shadow-lg transition-all duration-200 hover:border-teal-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-r from-teal-100 to-teal-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">
                  Credit Check New Customer
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-slate-600">
              Check customer eligibility for flexible payment options and send onboarding
              invitations.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              onClick={onCreditCheck}
              className="w-full bg-gradient-to-r from-[#2f9a8a] to-[#133b4f] hover:from-[#2a8a7a] hover:to-[#0f2d3f] text-white font-semibold py-3 rounded-lg transition-all duration-200 hover:shadow-md"
            >
              <span>Add Customer</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between home-action bg-white border-slate-200 hover:shadow-lg transition-all duration-200 hover:border-teal-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-r from-teal-100 to-blue-50 rounded-lg">
                <Bot className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">Ask AI Copilot</CardTitle>
              </div>
            </div>
            <CardDescription className="text-slate-600">
              Get AI-powered insights and assistance for your financial analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              onClick={onAICopilot}
              className="w-full bg-gradient-to-r from-[#2f9a8a] to-[#133b4f] hover:from-[#2a8a7a] hover:to-[#0f2d3f] text-white font-semibold py-3 rounded-lg transition-all duration-200 hover:shadow-md"
            >
              <span>Open AI Copilot</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Key patterns:**

1. **Props destructuring:**

   ```javascript
   {
     onCreditCheck, onAICopilot, (loading = false);
   }
   ```

   - Extracts props from props object
   - `loading` has default value `false`

2. **Grid layout:**

   ```javascript
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
   ```

   - 1 column on mobile, 2 columns on large screens
   - `gap-6` creates space between cards

3. **Event handlers:**

   ```javascript
   onClick = { onCreditCheck };
   ```

   - Passes function reference (not calling it)
   - Function runs when button is clicked

4. **Hover effects:**
   ```javascript
   hover:shadow-lg transition-all duration-200
   ```
   - Shadow appears on hover
   - Smooth transition animation

---

## Common Patterns and Best Practices

### Component Organization

**File structure:**

```
components/
└── dashboards/
    ├── supplier-dashboard.tsx      # Main component
    └── supplier/                    # Sub-components
        ├── SupplierHeader.tsx
        ├── QuickActions.tsx
        └── StatusNotifications.tsx
```

**Principles:**

- One component per file
- Group related components in folders
- Co-locate components that are only used together

### Naming Conventions

**Components:**

- PascalCase: `SupplierDashboard`, `QuickActions`
- Descriptive names that explain purpose

**Files:**

- Match component name: `SupplierDashboard.tsx`
- Use kebab-case for folders: `supplier-dashboard/`

**Functions:**

- camelCase: `handleCreditCheck`, `loadFinancingRequests`
- Start with verb: `handle`, `load`, `get`, `set`

**Constants:**

- UPPER_SNAKE_CASE: `DEFAULT_LIMITS`, `CUSTOMERS_DATA`

### TypeScript Integration

**Type annotations:**

```typescript
const [financingRequests, setFinancingRequests] = useState<FinancingRequest[]>(
  []
);
```

**Interface definitions:**

```typescript
interface QuickActionsProps {
  onCreditCheck: () => void;
  onAICopilot: () => void;
  loading?: boolean;
}
```

**Benefits:**

- Catches errors before runtime
- Provides autocomplete in IDE
- Self-documenting code

### Performance Considerations

#### When to use useMemo

```javascript
// ✅ Good: Expensive calculation
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.date - b.date);
}, [items]);

// ❌ Bad: Simple operation
const doubled = useMemo(() => count * 2, [count]);
```

**Rule of thumb:** Only memoize expensive operations (sorting, filtering large arrays, complex calculations).

#### When to use useCallback

```javascript
// ✅ Good: Function passed as prop
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);

// ❌ Bad: Function only used locally
const handleClick = useCallback(() => {
  setCount(count + 1);
}, [count]);
```

**Rule of thumb:** Only memoize functions passed to child components that are memoized with `React.memo`.

### Accessibility

**Semantic HTML:**

```javascript
// ✅ Good
<main>
  <h1>Welcome</h1>
  <button onClick={handleClick}>Click me</button>
</main>

// ❌ Bad
<div>
  <div>Welcome</div>
  <div onClick={handleClick}>Click me</div>
</div>
```

**ARIA attributes:**

```javascript
<button aria-label="Close dialog" aria-expanded={isOpen}>
  <XIcon />
</button>
```

**Keyboard navigation:**

- Use semantic elements (`<button>`, not `<div>`)
- Ensure focus indicators are visible
- Support Tab navigation

### Error Handling

**Try-catch in effects:**

```javascript
useEffect(() => {
  try {
    const data = loadData();
    setData(data);
  } catch (error) {
    console.error("Failed to load:", error);
    // Show error to user
  }
}, []);
```

**Loading states:**

```javascript
if (loading) return <LoadingSkeleton />;
if (error) return <ErrorMessage />;
return <Content />;
```

### Code Organization Best Practices

1. **Keep components small** - Single responsibility
2. **Extract reusable logic** - Custom hooks
3. **Use constants** - Don't repeat magic numbers/strings
4. **Type everything** - TypeScript helps catch errors
5. **Comment why, not what** - Code should be self-explanatory

---

## Visual Diagrams

### Component Tree

```
HomePage
│
├── UserContext (provides userType)
│
└── Conditional Rendering
    │
    ├── If userType === "buyer"
    │   └── BuyerDashboard
    │       ├── Welcome Header
    │       ├── Credit Score Card
    │       ├── Credit Limit Card
    │       ├── Connected Services Card
    │       ├── Share Profile Card
    │       └── Notifications
    │
    ├── If userType === "supplier"
    │   └── SupplierDashboard
    │       ├── SupplierHeader
    │       ├── QuickActions
    │       │   ├── Credit Check Card
    │       │   └── AI Copilot Card
    │       └── Notifications Section
    │           ├── StatusNotifications
    │           ├── AlertsNotifications
    │           └── RequestsNotifications
    │
    └── Default (financial_institution)
        └── FinancialInstitutionDashboard
            ├── FiHeader
            ├── FiQuickActions
            └── Notifications Section
                ├── FiStatusNotifications
                ├── FiAlertsNotifications
                └── FiRequestsNotifications
```

### Data Flow Diagram

```
┌─────────────────┐
│  localStorage   │
│  (userType)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UserContext    │
│  (Provider)     │
└────────┬────────┘
         │
         │ Provides { userType, setUserType }
         │
         ▼
┌─────────────────┐
│   useUser()     │
│   (Hook)        │
└────────┬────────┘
         │
         │ Returns userType
         │
         ▼
┌─────────────────┐
│   HomePage      │
│   Component     │
└────────┬────────┘
         │
         │ Reads userType
         │
         ▼
┌─────────────────┐
│  Conditional    │
│  Rendering      │
└────────┬────────┘
         │
         ├───► BuyerDashboard
         ├───► SupplierDashboard
         └───► FinancialInstitutionDashboard
```

### Layout Structure

```
┌─────────────────────────────────────────┐
│         DashboardLayout                  │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │ Sidebar  │  │   Main Content       │ │
│  │          │  │   ┌──────────────┐   │ │
│  │ (Buyer   │  │   │  HomePage    │   │ │
│  │  or      │  │   │              │   │ │
│  │ Business)│  │   │  ┌────────┐  │   │ │
│  │          │  │   │  │Header  │  │   │ │
│  │          │  │   │  └────────┘  │   │ │
│  │          │  │   │  ┌────────┐  │   │ │
│  │          │  │   │  │Actions │  │   │ │
│  │          │  │   │  └────────┘  │   │ │
│  │          │  │   │  ┌────────┐  │   │ │
│  │          │  │   │  │Notifs  │  │   │ │
│  │          │  │   │  └────────┘  │   │ │
│  └──────────┘  └──────────────────────┘ │
└─────────────────────────────────────────┘
```

### Styling Flow

```
Tailwind Classes
      │
      ├───► Utility Classes (p-4, mb-8, etc.)
      │
      ├───► Responsive Prefixes (sm:, md:, lg:)
      │
      ├───► State Variants (hover:, focus:)
      │
      └───► Compiled CSS
              │
              └───► Applied to Elements
```

---

## Exercises and Learning Path

### Suggested Learning Path

1. **Start Here:**

   - Understand the home page structure
   - Learn React component basics
   - Practice reading JSX

2. **Next Steps:**

   - Explore dashboard components
   - Understand props and state
   - Learn about hooks

3. **Intermediate:**

   - Study Context API
   - Learn useEffect patterns
   - Understand performance optimization

4. **Advanced:**
   - Custom hooks
   - Advanced TypeScript
   - Performance profiling

### Related Files to Explore

**Beginner:**

- `components/dashboards/supplier/SupplierHeader.tsx` - Simple component
- `components/dashboards/supplier/QuickActions.tsx` - Props and event handlers

**Intermediate:**

- `components/user-context.tsx` - Context API example
- `components/dashboards/supplier-dashboard.tsx` - Complex state management

**Advanced:**

- `hooks/use-chart-animations.ts` - Custom hook example
- `app/(dashboard)/layout.tsx` - Layout patterns

### Practice Exercises

1. **Create a new dashboard component:**

   - Copy `SupplierDashboard`
   - Modify it to show different content
   - Add it to the home page conditional rendering

2. **Add a new prop:**

   - Add a `title` prop to `SupplierHeader`
   - Pass it from `SupplierDashboard`
   - Use it in the component

3. **Create a custom hook:**

   - Extract the financing requests logic
   - Create `useFinancingRequests` hook
   - Use it in the dashboard

4. **Style a component:**
   - Add Tailwind classes to a component
   - Make it responsive
   - Add hover effects

### Common Mistakes to Avoid

1. **Mutating state directly:**

   ```javascript
   // ❌ Wrong
   items.push(newItem);

   // ✅ Correct
   setItems([...items, newItem]);
   ```

2. **Missing dependencies in useEffect:**

   ```javascript
   // ❌ Wrong - missing dependency
   useEffect(() => {
     doSomething(value);
   }, []);

   // ✅ Correct
   useEffect(() => {
     doSomething(value);
   }, [value]);
   ```

3. **Calling hooks conditionally:**

   ```javascript
   // ❌ Wrong
   if (condition) {
     const [state, setState] = useState();
   }

   // ✅ Correct
   const [state, setState] = useState();
   if (condition) {
     // use state
   }
   ```

4. **Using `class` instead of `className`:**

   ```javascript
   // ❌ Wrong
   <div class="container">

   // ✅ Correct
   <div className="container">
   ```

5. **Forgetting "use client" directive:**

   ```javascript
   // ❌ Wrong - can't use hooks
   function Component() {
     const [state, setState] = useState();
   }

   // ✅ Correct
   ("use client");
   function Component() {
     const [state, setState] = useState();
   }
   ```

### Next Steps

1. **Read the React documentation:**

   - [React Docs](https://react.dev)
   - Focus on hooks and components

2. **Learn Next.js:**

   - [Next.js Docs](https://nextjs.org/docs)
   - Focus on App Router and routing

3. **Master Tailwind CSS:**

   - [Tailwind Docs](https://tailwindcss.com/docs)
   - Practice with the utility classes

4. **Explore the codebase:**

   - Look at other pages
   - Study component patterns
   - Read TypeScript types

5. **Build something:**
   - Create a new page
   - Add a new component
   - Practice what you've learned

---

## Conclusion

Congratulations! You've learned how the home page works and the key concepts behind React, Next.js, and Tailwind CSS. The home page demonstrates:

- **Component composition** - Building complex UIs from simple pieces
- **Conditional rendering** - Showing different content based on state
- **State management** - Using Context API to share state
- **Styling** - Using Tailwind CSS for responsive design
- **Next.js routing** - Understanding the App Router system

Keep exploring the codebase, and don't hesitate to experiment. The best way to learn is by doing!

---

_This guide was created to help programmers with basic JavaScript knowledge learn React, Next.js, and CSS through practical examples. If you have questions or suggestions for improvement, please contribute!_
