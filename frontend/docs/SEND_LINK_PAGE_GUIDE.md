# Send Link Page Guide: Intermediate React Concepts

## Table of Contents

1. [Introduction](#introduction)
2. [Understanding the Send Link Page](#understanding-the-send-link-page)
3. [Form Handling Deep Dive](#form-handling-deep-dive)
4. [Async Operations and Error Handling](#async-operations-and-error-handling)
5. [Tab Switching Pattern](#tab-switching-pattern)
6. [Derived State and Helper Functions](#derived-state-and-helper-functions)
7. [Form Validation](#form-validation)
8. [Reusable Layout Components](#reusable-layout-components)
9. [Custom Events and localStorage](#custom-events-and-localstorage)
10. [Code Walkthrough](#code-walkthrough)
11. [Advanced Patterns](#advanced-patterns)
12. [Exercises and Next Steps](#exercises-and-next-steps)

---

## Introduction

### What This Guide Is About

This guide builds on the concepts from [HOME_PAGE_GUIDE.md](./HOME_PAGE_GUIDE.md) and uses the send-link page (`app/(dashboard)/send-link/page.tsx`) to teach **intermediate React concepts**. If you've completed the home page guide, you're ready to learn more advanced patterns.

### Prerequisites

Before reading this guide, you should understand:

- React components and JSX (from HOME_PAGE_GUIDE.md)
- useState and useEffect hooks (from HOME_PAGE_GUIDE.md)
- Props and component composition (from HOME_PAGE_GUIDE.md)
- Basic TypeScript (from HOME_PAGE_GUIDE.md)

### What Makes This Page Different?

The home page was simple: it conditionally rendered different dashboards based on user type. The send-link page is more complex:

- **Forms** - Multiple input fields that need to be managed
- **Async operations** - Sending emails requires waiting for API calls
- **Error handling** - What happens when things go wrong?
- **Tab switching** - User can switch between SMS and Email modes
- **Validation** - Forms need to be validated before submission
- **Cross-component communication** - Components need to sync via events

### New Concepts You'll Learn

1. **Form Handling** - Controlled components and managing form state
2. **Async/Await** - Handling asynchronous operations properly
3. **Error Handling** - Try/catch/finally patterns
4. **Tab Switching** - State-based UI switching patterns
5. **Derived State** - Computing values from other state
6. **Form Validation** - Client-side validation patterns
7. **Reusable Layouts** - Building reusable component wrappers
8. **Custom Events** - Cross-component communication
9. **localStorage** - Browser storage integration
10. **Helper Functions** - Extracting logic into utilities

---

## Understanding the Send Link Page

### What Does This Page Do?

The send-link page allows users to send onboarding invitations to customers via SMS or Email. It includes:

- **Tab switching** between SMS and Email modes
- **Form inputs** for recipient information
- **Template selection** for pre-written messages
- **Preview functionality** to see what will be sent
- **Validation** to ensure forms are complete
- **Success/error feedback** after sending

### Component Structure

```
SendLinkPage
├── PageLayout (reusable wrapper)
│   ├── SendLinkHeader (tab switcher)
│   └── Conditional Content
│       ├── SmsForm (if activeTab === "sms")
│       │   ├── Phone input
│       │   ├── Message textarea
│       │   ├── TemplatesList
│       │   └── SmsPreview
│       └── EmailForm (if activeTab === "email")
│           ├── Email input
│           ├── Subject input
│           ├── Rich text editor
│           ├── TemplatesList
│           └── EmailPreview
```

### Key Features

**1. Tab Switching**
- User can switch between SMS and Email modes
- State determines which form is shown
- Tab state persists during the session

**2. Form Management**
- Multiple input fields per form
- Each field has its own state
- Forms validate before submission

**3. Template System**
- Pre-written templates can be inserted
- Templates stored in localStorage
- Custom events notify when templates change

**4. Async Operations**
- Sending emails is asynchronous
- Loading states during operations
- Error handling if operations fail

---

## Form Handling Deep Dive

Forms are everywhere in web applications. Let's see how React handles them.

### Controlled vs Uncontrolled Components

React has two ways to handle form inputs:

**Uncontrolled Components** (traditional HTML):
```javascript
<input type="text" />
```
- React doesn't control the value
- You'd use `ref` to access the value
- Less React-like, harder to validate

**Controlled Components** (React way):
```javascript
const [value, setValue] = useState("");
<input value={value} onChange={(e) => setValue(e.target.value)} />
```
- React controls the value through state
- Value is always in sync with state
- Easy to validate and manipulate

The send-link page uses **controlled components** throughout.

### Managing Multiple Form Fields

The EmailForm component manages multiple fields:

```36:58:components/send-link/email-form.tsx
export function EmailForm({
  templates,
  loading = false,
  onSendEmail,
}: EmailFormProps) {
  const router = useRouter();
  const [emailUsername, setEmailUsername] = useState("");
  const [emailDomain, setEmailDomain] = useState("gmail.com");
  const [customEmailDomain, setCustomEmailDomain] = useState("");
  const [customEmailMessage, setCustomEmailMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [writePreviewTab, setWritePreviewTab] = useState<"write" | "preview">(
    "write"
  );
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
```

**What's happening:**

1. **Multiple useState hooks** - Each form field has its own state
2. **Initial values** - Some have defaults (`emailDomain = "gmail.com"`)
3. **Related state** - `emailSentSuccess`, `isSending`, `error` track form status

**Why separate state for each field?**

- **Clarity** - Easy to see what fields exist
- **Validation** - Can validate each field independently
- **Reset** - Can reset individual fields easily
- **Performance** - Only re-renders when specific field changes

### onChange Handlers Pattern

Each input has an `onChange` handler that updates state:

```120:128:components/send-link/email-form.tsx
                  <Input
                    id="email-username"
                    type="text"
                    placeholder="username"
                    value={emailUsername}
                    onChange={(e) => setEmailUsername(e.target.value)}
                    className="bg-white flex-1"
                  />
```

**Breaking it down:**

- `value={emailUsername}` - Controlled value from state
- `onChange={(e) => setEmailUsername(e.target.value)}` - Updates state on change
- `e.target.value` - The new value from the input

**The flow:**

```
User types → onChange fires → setEmailUsername called → State updates → Component re-renders → Input shows new value
```

This is **two-way data binding** - the input value is always in sync with React state.

### Form State Management Patterns

**Pattern 1: Individual State (used in send-link)**
```javascript
const [username, setUsername] = useState("");
const [domain, setDomain] = useState("gmail.com");
```

**Pros:**
- Simple and clear
- Easy to validate individual fields
- Good for forms with few fields

**Cons:**
- Many useState calls for large forms
- Harder to reset entire form

**Pattern 2: Single Object State**
```javascript
const [formData, setFormData] = useState({
  username: "",
  domain: "gmail.com",
});

// Update single field
setFormData({ ...formData, username: newValue });
```

**Pros:**
- Single state object
- Easy to reset entire form
- Good for large forms

**Cons:**
- More verbose updates
- Need to spread object on every update

The send-link page uses Pattern 1 because it's simpler and the forms aren't huge.

---

## Async Operations and Error Handling

Real applications need to handle asynchronous operations like API calls. Let's see how the send-link page does it.

### Async/Await Syntax

The `handleSendEmail` function is async:

```48:100:components/send-link/email-form.tsx
  const handleSendEmail = async (
    email: string,
    subject: string,
    content: string
  ) => {
    const validation = validateEmailForm(
      emailUsername,
      emailDomain,
      customEmailDomain,
      emailSubject,
      customEmailMessage
    );

    if (!validation.isValid) {
      setError(validation.error || "Please fill in all required fields");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await onSendEmail(recipientEmail, emailSubject, customEmailMessage);

      setEmailSentSuccess(true);
      setEmailUsername("");
      setEmailDomain("gmail.com");
      setCustomEmailDomain("");
      setCustomEmailMessage("");
      setEmailSubject("");

      setTimeout(() => {
        setEmailSentSuccess(false);
      }, 5000);
    } catch (err) {
      console.error("Failed to send email:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send email. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };
```

**Key concepts:**

1. **`async` function** - Can use `await` inside
2. **`await`** - Waits for promise to resolve
3. **`try/catch/finally`** - Error handling pattern

### Try/Catch/Finally Pattern

**Try block** - Code that might throw errors:
```javascript
try {
  await onSendEmail(...);
  // Success code here
}
```

**Catch block** - Handles errors:
```javascript
catch (err) {
  setError(err.message);
}
```

**Finally block** - Always runs (cleanup):
```javascript
finally {
  setIsSending(false); // Always reset loading state
}
```

**Why finally?**
- Ensures cleanup code always runs
- Even if error occurs, loading state is reset
- Prevents UI from getting stuck in loading state

### Loading States

The form tracks loading state:

```javascript
const [isSending, setIsSending] = useState(false);
```

**Usage:**

1. **Set loading before operation:**
   ```javascript
   setIsSending(true);
   ```

2. **Reset loading after operation:**
   ```javascript
   finally {
     setIsSending(false);
   }
   ```

3. **Disable button during loading:**
   ```javascript
   <Button disabled={isSending}>
     {isSending ? "Sending..." : "Send Email"}
   </Button>
   ```

**Why loading states matter:**
- Prevents double-submission
- Shows user that something is happening
- Improves user experience

### Error State Management

Errors are stored in state:

```javascript
const [error, setError] = useState<string | null>(null);
```

**Setting errors:**

1. **Validation errors:**
   ```javascript
   if (!validation.isValid) {
     setError(validation.error);
     return;
   }
   ```

2. **API errors:**
   ```javascript
   catch (err) {
     setError(err.message);
   }
   ```

3. **Clearing errors:**
   ```javascript
   setError(null); // Clear before new attempt
   ```

**Displaying errors:**
```javascript
{error && <div className="text-red-600">{error}</div>}
```

### Success Feedback with Auto-Hide

Success messages auto-hide after 5 seconds:

```javascript
setEmailSentSuccess(true);

setTimeout(() => {
  setEmailSentSuccess(false);
}, 5000);
```

**Why setTimeout?**
- Success messages shouldn't stay forever
- Auto-hide improves UX
- User sees confirmation but doesn't need to dismiss

**Important:** Always clear timeouts if component unmounts:
```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    setEmailSentSuccess(false);
  }, 5000);
  
  return () => clearTimeout(timer); // Cleanup
}, [emailSentSuccess]);
```

---

## Tab Switching Pattern

The send-link page uses tabs to switch between SMS and Email modes. This is different from the conditional rendering we saw in the home page.

### State-Based UI Switching

The page uses state to control which form is shown:

```13:14:app/(dashboard)/send-link/page.tsx
export default function SendLinkPage() {
  const [activeTab, setActiveTab] = useState<"sms" | "email">("email");
```

**Key differences from home page:**

| Home Page | Send Link Page |
|-----------|---------------|
| Conditional based on user type | Conditional based on user choice |
| State comes from Context | State managed locally |
| User can't change it | User can switch tabs |
| One-way decision | Interactive switching |

### Tab Component Implementation

The `SendLinkHeader` component handles tab switching:

```11:33:components/send-link/send-link-header.tsx
export function SendLinkHeader({
  activeTab,
  onTabChange,
}: SendLinkHeaderProps) {
  return (
    <>
      <Button
        variant={activeTab === "email" ? "default" : "outline"}
        onClick={() => onTabChange("email")}
      >
        <Mail className="mr-2 h-4 w-4" />
        Email Invitation
      </Button>
      <Button
        variant={activeTab === "sms" ? "default" : "outline"}
        onClick={() => onTabChange("sms")}
      >
        <MessageSquare className="mr-2 h-4 w-4" />
        SMS Invitation
      </Button>
    </>
  );
}
```

**How it works:**

1. **Props** - Receives `activeTab` and `onTabChange` callback
2. **Visual state** - Button variant changes based on `activeTab`
3. **Click handler** - Calls `onTabChange` with new tab value

**Pattern:**
- Parent manages state (`activeTab`)
- Child receives state and callback
- Child triggers state change via callback
- Parent re-renders with new state

### Conditional Rendering Based on Tab

The page conditionally renders forms:

```69:79:app/(dashboard)/send-link/page.tsx
      {activeTab === "sms" && (
        <SmsForm templates={smsTemplates} loading={isLoadingTemplates} />
      )}

      {activeTab === "email" && (
        <EmailForm
          templates={emailTemplates}
          loading={isLoadingTemplates}
          onSendEmail={handleSendEmail}
        />
      )}
```

**Why `&&` instead of ternary?**

```javascript
// ✅ Good for simple conditionals
{activeTab === "sms" && <SmsForm />}

// ✅ Also works, but more verbose
{activeTab === "sms" ? <SmsForm /> : null}
```

Both work, but `&&` is more concise when you only need to show something conditionally.

### Tab State Management Best Practices

**1. Type-safe tab values:**
```typescript
const [activeTab, setActiveTab] = useState<"sms" | "email">("email");
```
- TypeScript ensures only valid values
- Prevents typos and invalid states

**2. Default value:**
```typescript
useState<"sms" | "email">("email")
```
- Always start with a valid tab selected
- Prevents empty state on first render

**3. Controlled component pattern:**
```typescript
<SendLinkHeader activeTab={activeTab} onTabChange={setActiveTab} />
```
- State lives in parent
- Child is "controlled" by parent state
- Single source of truth

---

## Derived State and Helper Functions

Sometimes you need to compute values from other state. Let's see how the send-link page does this.

### What is Derived State?

Derived state is a value calculated from other state, not stored separately.

**Example from EmailForm:**

```54:58:components/send-link/email-form.tsx
  const recipientEmail = buildRecipientEmail(
    emailUsername,
    emailDomain,
    customEmailDomain
  );
```

`recipientEmail` is **derived** from `emailUsername`, `emailDomain`, and `customEmailDomain`. It's not stored in state - it's calculated every render.

### Helper Functions

The `buildRecipientEmail` function is a helper:

```23:36:lib/send-link.ts
export function buildRecipientEmail(
  username: string,
  domain: string,
  customDomain?: string
): string {
  if (!username) return "";
  if (domain === "custom" && customDomain) {
    return `${username}@${customDomain}`;
  }
  if (domain !== "custom") {
    return `${username}@${domain}`;
  }
  return "";
}
```

**Why extract to helper function?**

1. **Reusability** - Can use in multiple places
2. **Testability** - Easy to test independently
3. **Clarity** - Component code is cleaner
4. **Maintainability** - Change logic in one place

### When to Use useMemo vs Direct Calculation

**Direct calculation (used in send-link):**
```javascript
const recipientEmail = buildRecipientEmail(
  emailUsername,
  emailDomain,
  customEmailDomain
);
```

**With useMemo:**
```javascript
const recipientEmail = useMemo(() => {
  return buildRecipientEmail(
    emailUsername,
    emailDomain,
    customEmailDomain
  );
}, [emailUsername, emailDomain, customEmailDomain]);
```

**When to use each:**

**Direct calculation** (use when):
- Calculation is cheap (string concatenation)
- Dependencies change frequently anyway
- Code is simpler without memoization

**useMemo** (use when):
- Calculation is expensive (sorting large arrays)
- Dependencies change rarely
- Performance is critical

For `buildRecipientEmail`, direct calculation is fine - it's just string concatenation.

### Pure Functions

Helper functions should be **pure functions**:

**Pure function:**
```javascript
function buildRecipientEmail(username, domain) {
  return `${username}@${domain}`;
}
```
- Same input → same output
- No side effects
- Easy to test

**Impure function:**
```javascript
let globalCounter = 0;
function buildRecipientEmail(username, domain) {
  globalCounter++; // Side effect!
  return `${username}@${domain}`;
}
```
- Has side effects
- Harder to test
- Unpredictable

**Benefits of pure functions:**
- Predictable behavior
- Easy to test
- Can be memoized
- No hidden dependencies

---

## Form Validation

Forms need validation before submission. Let's see how the send-link page handles this.

### Client-Side Validation

Validation happens before the async operation:

```60:72:components/send-link/email-form.tsx
  const handleSendEmail = async () => {
    const validation = validateEmailForm(
      emailUsername,
      emailDomain,
      customEmailDomain,
      emailSubject,
      customEmailMessage
    );

    if (!validation.isValid) {
      setError(validation.error || "Please fill in all required fields");
      return;
    }
```

**Why validate before async call?**

- **Immediate feedback** - User knows what's wrong right away
- **Saves API calls** - Don't waste requests on invalid data
- **Better UX** - No waiting for server to reject invalid data

### Validation Helper Function

Validation logic is extracted to a helper:

```74:98:lib/send-link.ts
export function validateEmailForm(
  username: string,
  domain: string,
  customDomain: string,
  subject: string,
  content: string
): { isValid: boolean; error?: string } {
  const isValidEmail =
    username &&
    (domain !== "custom" || (domain === "custom" && customDomain));

  if (!isValidEmail) {
    return { isValid: false, error: "Please provide a valid email address" };
  }

  if (!subject) {
    return { isValid: false, error: "Please provide an email subject" };
  }

  if (isEmailContentEmpty(content)) {
    return { isValid: false, error: "Please provide email content" };
  }

  return { isValid: true };
}
```

**Validation pattern:**

1. **Check each requirement** - Email, subject, content
2. **Return early** - First failure stops validation
3. **Return object** - `{ isValid, error? }` pattern
4. **Specific error messages** - Tell user exactly what's wrong

### Disabled Button States

The send button is disabled when form is invalid:

```191:208:components/send-link/email-form.tsx
                  <Button
                    onClick={handleSendEmail}
                    disabled={
                      !emailUsername ||
                      (emailDomain === "custom" && !customEmailDomain) ||
                      isEmailContentEmpty(customEmailMessage) ||
                      isSending
                    }
                    className="gap-2 bg-[#2f9a8a] text-white hover:bg-[#2a8a7a]"
                    size="lg"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isSending ? "Sending..." : "Send Email"}
                  </Button>
```

**Disabled conditions:**

1. **Missing username** - `!emailUsername`
2. **Custom domain without value** - `emailDomain === "custom" && !customEmailDomain`
3. **Empty content** - `isEmailContentEmpty(customEmailMessage)`
4. **Currently sending** - `isSending`

**Why disable button?**

- **Prevents invalid submissions** - Can't submit incomplete forms
- **Visual feedback** - User knows form isn't ready
- **Better UX** - Clear indication of form state

### Validation Best Practices

**1. Validate early:**
```javascript
if (!validation.isValid) {
  setError(validation.error);
  return; // Stop execution
}
```

**2. Show specific errors:**
```javascript
"Please provide a valid email address" // ✅ Specific
"Invalid input" // ❌ Too vague
```

**3. Clear errors on new attempt:**
```javascript
setError(null); // Clear before validation
```

**4. Disable submit button:**
```javascript
disabled={!isFormValid || isSubmitting}
```

---

## Reusable Layout Components

The send-link page uses a reusable `PageLayout` component. Let's see how this pattern works.

### What is a Layout Component?

A layout component wraps content with consistent structure and styling. The `PageLayout` component provides:

- Consistent page header
- Max width container
- Responsive padding
- Optional header actions

### PageLayout Component

```14:48:components/dashboard/page-layout.tsx
export function PageLayout({
  title,
  description,
  children,
  headerActions,
  maxWidth = "7xl",
  background = "white",
}: PageLayoutProps) {
  const backgroundClass =
    background === "slate-50" ? "bg-slate-50" : "bg-white";
  const maxWidthClass = maxWidth === "4xl" ? "max-w-4xl" : "max-w-7xl";

  return (
    <main className={`flex-1 overflow-y-auto ${backgroundClass} min-h-screen`}>
      <div className={`${maxWidthClass} mx-auto p-4 sm:p-6 lg:p-8`}>
        {/* Header */}
        <div
          className={`flex flex-col ${
            headerActions ? "sm:flex-row sm:items-center" : ""
          } justify-between mb-6 sm:mb-8 gap-4`}
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {title}
            </h1>
            {description && <p className="text-gray-600">{description}</p>}
          </div>
          {headerActions && <div>{headerActions}</div>}
        </div>

        {children}
      </div>
    </main>
  );
}
```

### Props with Children

The `children` prop is special in React:

```javascript
<PageLayout title="Send Link">
  <EmailForm /> {/* This is children */}
</PageLayout>
```

**How it works:**

1. **`children` prop** - Contains whatever is between opening/closing tags
2. **Rendered with `{children}`** - Placed where you want content
3. **Flexible** - Can be any React node (component, text, etc.)

### Optional Props with Defaults

Some props have default values:

```typescript
maxWidth = "7xl",
background = "white",
```

**Usage:**

```javascript
// Uses defaults
<PageLayout title="Page">Content</PageLayout>

// Override defaults
<PageLayout title="Page" maxWidth="4xl" background="slate-50">
  Content
</PageLayout>
```

**Benefits:**

- **Flexible** - Can customize when needed
- **Sensible defaults** - Works without specifying everything
- **Less code** - Don't repeat common values

### Conditional Rendering in Props

Props can conditionally render content:

```javascript
{description && <p>{description}</p>}
{headerActions && <div>{headerActions}</div>}
```

**Pattern:**
- Only render if prop exists
- Keeps layout flexible
- No empty elements if prop is undefined

### Benefits of Reusable Layouts

**1. Consistency:**
- All pages look the same
- Easy to maintain styling

**2. DRY (Don't Repeat Yourself):**
- Write layout code once
- Reuse across pages

**3. Easy updates:**
- Change layout in one place
- All pages update automatically

**4. Type safety:**
- TypeScript ensures correct props
- Catches errors early

---

## Custom Events and localStorage

The send-link page uses custom events to sync template changes across components. Let's see how this works.

### The Problem

When templates are updated in one place, other components need to know:

- User edits template on `/send-link/templates`
- Send-link page needs to reload templates
- Components aren't directly connected

### Custom Events Solution

Custom events allow cross-component communication:

```19:36:app/(dashboard)/send-link/page.tsx
  useEffect(() => {
    loadTemplates();

    const handleEmailUpdate = () => loadTemplates();
    const handleSmsUpdate = () => loadTemplates();

    window.addEventListener("emailTemplateUpdated", handleEmailUpdate);
    window.addEventListener("emailTemplateDeleted", handleEmailUpdate);
    window.addEventListener("smsTemplateUpdated", handleSmsUpdate);
    window.addEventListener("smsTemplateDeleted", handleSmsUpdate);

    return () => {
      window.removeEventListener("emailTemplateUpdated", handleEmailUpdate);
      window.removeEventListener("emailTemplateDeleted", handleEmailUpdate);
      window.removeEventListener("smsTemplateUpdated", handleSmsUpdate);
      window.removeEventListener("smsTemplateDeleted", handleSmsUpdate);
    };
  }, []);
```

**How it works:**

1. **Listen for events** - `addEventListener` for custom events
2. **Handle updates** - Reload templates when event fires
3. **Cleanup** - Remove listeners on unmount

### Dispatching Custom Events

When templates are saved, events are dispatched:

```168:173:lib/template-storage.ts
    // Dispatch custom event to notify other pages
    window.dispatchEvent(
      new CustomEvent("emailTemplateUpdated", {
        detail: newTemplate,
      })
    );
```

**Event structure:**

- **Event name** - `"emailTemplateUpdated"`
- **Event data** - `detail: newTemplate`
- **Global** - Dispatched on `window`

### localStorage Integration

Templates are stored in browser localStorage:

```17:55:lib/template-storage.ts
export function getEmailTemplates(): EmailTemplate[] {
  if (typeof window === "undefined") {
    return defaultEmailTemplates;
  }

  try {
    const stored = localStorage.getItem(EMAIL_TEMPLATES_STORAGE_KEY);
    const userTemplates: EmailTemplate[] = stored
      ? JSON.parse(stored)
      : [];

    // Merge default templates with user-created templates
    // User templates take precedence if they have the same ID
    const defaultMap = new Map(
      defaultEmailTemplates.map((t) => [t.id, { ...t, isDefault: true }])
    );
    const userMap = new Map(
      userTemplates.map((t) => [t.id, { ...t, isDefault: false }])
    );

    // Combine: defaults that aren't overridden + all user templates
    const merged: EmailTemplate[] = [];
    
    // Add all user templates first
    userMap.forEach((template) => merged.push(template));
    
    // Add default templates that weren't overridden
    defaultMap.forEach((template, id) => {
      if (!userMap.has(id)) {
        merged.push(template);
      }
    });

    return merged;
  } catch (error) {
    console.error("Failed to retrieve email templates:", error);
    return defaultEmailTemplates;
  }
}
```

### SSR Considerations

**Problem:** localStorage doesn't exist on server

**Solution:** Check `typeof window`:

```javascript
if (typeof window === "undefined") {
  return defaultEmailTemplates; // Server-side fallback
}
```

**Why this matters:**

- Next.js renders on server first
- localStorage only exists in browser
- Need to handle both cases

### Reading from localStorage

```javascript
const stored = localStorage.getItem(EMAIL_TEMPLATES_STORAGE_KEY);
const userTemplates = stored ? JSON.parse(stored) : [];
```

**Pattern:**

1. **Get item** - `localStorage.getItem(key)`
2. **Parse JSON** - `JSON.parse(stored)`
3. **Handle null** - Return empty array if nothing stored

### Writing to localStorage

```javascript
localStorage.setItem(
  EMAIL_TEMPLATES_STORAGE_KEY,
  JSON.stringify(updatedTemplates)
);
```

**Pattern:**

1. **Stringify data** - `JSON.stringify(data)`
2. **Store** - `localStorage.setItem(key, value)`
3. **Dispatch event** - Notify other components

### Error Handling

Always wrap localStorage operations in try/catch:

```javascript
try {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
} catch (error) {
  console.error("Failed to retrieve:", error);
  return []; // Fallback value
}
```

**Why?**

- localStorage can throw errors
- Quota exceeded
- Invalid JSON
- Need graceful fallback

### Event-Driven Architecture Benefits

**1. Loose coupling:**
- Components don't need direct references
- Easy to add/remove listeners

**2. Scalability:**
- Multiple components can listen
- Easy to extend

**3. Separation of concerns:**
- Storage logic separate from UI
- Clear responsibilities

---

## Code Walkthrough

Let's walk through the key code sections line by line.

### SendLinkPage Component

```13:82:app/(dashboard)/send-link/page.tsx
export default function SendLinkPage() {
  const [activeTab, setActiveTab] = useState<"sms" | "email">("email");
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  useEffect(() => {
    loadTemplates();

    const handleEmailUpdate = () => loadTemplates();
    const handleSmsUpdate = () => loadTemplates();

    window.addEventListener("emailTemplateUpdated", handleEmailUpdate);
    window.addEventListener("emailTemplateDeleted", handleEmailUpdate);
    window.addEventListener("smsTemplateUpdated", handleSmsUpdate);
    window.addEventListener("smsTemplateDeleted", handleSmsUpdate);

    return () => {
      window.removeEventListener("emailTemplateUpdated", handleEmailUpdate);
      window.removeEventListener("emailTemplateDeleted", handleEmailUpdate);
      window.removeEventListener("smsTemplateUpdated", handleSmsUpdate);
      window.removeEventListener("smsTemplateDeleted", handleSmsUpdate);
    };
  }, []);

  const loadTemplates = () => {
    setIsLoadingTemplates(true);
    try {
      setEmailTemplates(getEmailTemplates());
      setSmsTemplates(getSmsTemplates());
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSendEmail = async (
    email: string,
    subject: string,
    content: string
  ) => {
    await sendBrevoEmail({
      to: email,
      subject,
    });
  };

  return (
    <PageLayout
      title="Send Onboarding Link"
      description="Invite customers to start their onboarding journey via SMS or Email"
      headerActions={
        <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
          <SendLinkHeader activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      }
    >
      {activeTab === "sms" && (
        <SmsForm templates={smsTemplates} loading={isLoadingTemplates} />
      )}

      {activeTab === "email" && (
        <EmailForm
          templates={emailTemplates}
          loading={isLoadingTemplates}
          onSendEmail={handleSendEmail}
        />
      )}
    </PageLayout>
  );
}
```

**Line-by-line breakdown:**

**Lines 14-17: State declarations**
- `activeTab` - Controls which form is shown
- `emailTemplates` / `smsTemplates` - Template data
- `isLoadingTemplates` - Loading state

**Lines 19-36: useEffect for event listeners**
- Loads templates on mount
- Sets up event listeners for template updates
- Cleans up listeners on unmount

**Lines 38-46: loadTemplates function**
- Sets loading state
- Loads templates from localStorage
- Always resets loading (finally block)

**Lines 48-57: handleSendEmail function**
- Async function
- Calls email service
- Passed to EmailForm as prop

**Lines 59-81: JSX return**
- Uses PageLayout wrapper
- Conditionally renders forms based on activeTab
- Passes props to child components

### EmailForm Key Sections

**State management:**
```42:52:components/send-link/email-form.tsx
  const [emailUsername, setEmailUsername] = useState("");
  const [emailDomain, setEmailDomain] = useState("gmail.com");
  const [customEmailDomain, setCustomEmailDomain] = useState("");
  const [customEmailMessage, setCustomEmailMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [writePreviewTab, setWritePreviewTab] = useState<"write" | "preview">(
    "write"
  );
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
```

**Derived state:**
```54:58:components/send-link/email-form.tsx
  const recipientEmail = buildRecipientEmail(
    emailUsername,
    emailDomain,
    customEmailDomain
  );
```

**Async handler with validation:**
```60:100:components/send-link/email-form.tsx
  const handleSendEmail = async () => {
    const validation = validateEmailForm(
      emailUsername,
      emailDomain,
      customEmailDomain,
      emailSubject,
      customEmailMessage
    );

    if (!validation.isValid) {
      setError(validation.error || "Please fill in all required fields");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await onSendEmail(recipientEmail, emailSubject, customEmailMessage);

      setEmailSentSuccess(true);
      setEmailUsername("");
      setEmailDomain("gmail.com");
      setCustomEmailDomain("");
      setCustomEmailMessage("");
      setEmailSubject("");

      setTimeout(() => {
        setEmailSentSuccess(false);
      }, 5000);
    } catch (err) {
      console.error("Failed to send email:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send email. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };
```

### PageLayout Component

```14:48:components/dashboard/page-layout.tsx
export function PageLayout({
  title,
  description,
  children,
  headerActions,
  maxWidth = "7xl",
  background = "white",
}: PageLayoutProps) {
  const backgroundClass =
    background === "slate-50" ? "bg-slate-50" : "bg-white";
  const maxWidthClass = maxWidth === "4xl" ? "max-w-4xl" : "max-w-7xl";

  return (
    <main className={`flex-1 overflow-y-auto ${backgroundClass} min-h-screen`}>
      <div className={`${maxWidthClass} mx-auto p-4 sm:p-6 lg:p-8`}>
        {/* Header */}
        <div
          className={`flex flex-col ${
            headerActions ? "sm:flex-row sm:items-center" : ""
          } justify-between mb-6 sm:mb-8 gap-4`}
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {title}
            </h1>
            {description && <p className="text-gray-600">{description}</p>}
          </div>
          {headerActions && <div>{headerActions}</div>}
        </div>

        {children}
      </div>
    </main>
  );
}
```

**Key patterns:**

1. **Default props** - `maxWidth = "7xl"`
2. **Computed classes** - `backgroundClass`, `maxWidthClass`
3. **Conditional rendering** - `{description && ...}`
4. **Children prop** - `{children}` renders content

---

## Advanced Patterns

### Multiple Event Listeners Pattern

When you need multiple listeners, organize them clearly:

```javascript
useEffect(() => {
  // Define handlers
  const handleEmailUpdate = () => loadTemplates();
  const handleSmsUpdate = () => loadTemplates();

  // Add listeners
  window.addEventListener("emailTemplateUpdated", handleEmailUpdate);
  window.addEventListener("emailTemplateDeleted", handleEmailUpdate);
  window.addEventListener("smsTemplateUpdated", handleSmsUpdate);
  window.addEventListener("smsTemplateDeleted", handleSmsUpdate);

  // Cleanup
  return () => {
    window.removeEventListener("emailTemplateUpdated", handleEmailUpdate);
    window.removeEventListener("emailTemplateDeleted", handleEmailUpdate);
    window.removeEventListener("smsTemplateUpdated", handleSmsUpdate);
    window.removeEventListener("smsTemplateDeleted", handleSmsUpdate);
  };
}, []);
```

**Best practices:**

1. **Define handlers first** - Clear what each does
2. **Group related listeners** - Easier to understand
3. **Match cleanup** - Remove exactly what you add
4. **Empty deps** - Only run on mount/unmount

### Loading State Management

Handle loading states consistently:

```javascript
const [isLoading, setIsLoading] = useState(true);

const loadData = () => {
  setIsLoading(true);
  try {
    const data = fetchData();
    setData(data);
  } finally {
    setIsLoading(false); // Always reset
  }
};
```

**Pattern:**

1. **Set loading before operation**
2. **Reset in finally block** - Always runs
3. **Use loading in UI** - Show spinner, disable buttons

### Error Handling Patterns

**Pattern 1: Validation errors**
```javascript
if (!isValid) {
  setError("Validation failed");
  return; // Stop execution
}
```

**Pattern 2: Try/catch**
```javascript
try {
  await operation();
} catch (err) {
  setError(err.message);
}
```

**Pattern 3: Error types**
```javascript
catch (err) {
  const message = err instanceof Error 
    ? err.message 
    : "Unknown error";
  setError(message);
}
```

### State Reset Pattern

Reset form state after successful submission:

```javascript
setEmailSentSuccess(true);
setEmailUsername("");
setEmailDomain("gmail.com");
setCustomEmailDomain("");
setCustomEmailMessage("");
setEmailSubject("");
```

**Why reset?**

- **Clean slate** - Ready for next submission
- **Better UX** - User sees form cleared
- **Prevents confusion** - Old data doesn't persist

### Component Organization

**File structure:**
```
components/
└── send-link/
    ├── email-form.tsx
    ├── sms-form.tsx
    ├── send-link-header.tsx
    └── templates-list.tsx
```

**Principles:**

1. **Group related components** - Keep send-link components together
2. **One component per file** - Easy to find and maintain
3. **Co-locate** - Keep components used together nearby

---

## Exercises and Next Steps

### Practice Exercises

1. **Add a new form field:**
   - Add a "CC" email field to EmailForm
   - Add state management
   - Add validation
   - Update the send handler

2. **Create a reusable form component:**
   - Extract common form patterns
   - Create a `FormField` component
   - Use it in EmailForm and SmsForm

3. **Add form reset functionality:**
   - Add a "Reset" button
   - Clear all form fields
   - Reset validation errors

4. **Improve error handling:**
   - Add specific error types
   - Show different messages for different errors
   - Add retry functionality

### Related Concepts to Explore

**1. Form Libraries:**
- React Hook Form
- Formik
- React Final Form

**2. Validation Libraries:**
- Zod
- Yup
- Joi

**3. State Management:**
- Zustand
- Jotai
- Redux Toolkit

**4. Async State Management:**
- React Query
- SWR
- RTK Query

### Common Mistakes to Avoid

1. **Forgetting to clean up event listeners:**
   ```javascript
   // ❌ Wrong - memory leak
   useEffect(() => {
     window.addEventListener("event", handler);
   }, []);

   // ✅ Correct - cleanup
   useEffect(() => {
     window.addEventListener("event", handler);
     return () => window.removeEventListener("event", handler);
   }, []);
   ```

2. **Not handling localStorage errors:**
   ```javascript
   // ❌ Wrong - can crash
   const data = JSON.parse(localStorage.getItem("key"));

   // ✅ Correct - handle errors
   try {
     const stored = localStorage.getItem("key");
     return stored ? JSON.parse(stored) : [];
   } catch (error) {
     return [];
   }
   ```

3. **Forgetting loading state reset:**
   ```javascript
   // ❌ Wrong - stuck in loading
   try {
     setIsLoading(true);
     await operation();
   } catch (err) {
     setError(err.message);
   }

   // ✅ Correct - always reset
   try {
     setIsLoading(true);
     await operation();
   } catch (err) {
     setError(err.message);
   } finally {
     setIsLoading(false);
   }
   ```

4. **Not validating before async call:**
   ```javascript
   // ❌ Wrong - wastes API call
   const handleSubmit = async () => {
     await apiCall(formData);
   };

   // ✅ Correct - validate first
   const handleSubmit = async () => {
     if (!isValid) {
       setError("Form is invalid");
       return;
     }
     await apiCall(formData);
   };
   ```

5. **Mutating state directly:**
   ```javascript
   // ❌ Wrong - doesn't trigger re-render
   formData.username = "new";

   // ✅ Correct - create new object
   setFormData({ ...formData, username: "new" });
   ```

### Next Steps

1. **Explore form libraries:**
   - Try React Hook Form
   - See how it simplifies form handling
   - Compare with manual state management

2. **Learn about React Query:**
   - Handle async state better
   - Automatic caching and refetching
   - Better error handling

3. **Study validation patterns:**
   - Learn Zod or Yup
   - Schema-based validation
   - Type-safe validation

4. **Practice with real APIs:**
   - Build forms that submit to real APIs
   - Handle different error types
   - Add retry logic

5. **Explore state management:**
   - When to use Context vs local state
   - When to use external state library
   - State management patterns

---

## Conclusion

Congratulations! You've learned intermediate React concepts through the send-link page:

- **Form handling** - Controlled components and state management
- **Async operations** - async/await and error handling
- **Tab switching** - State-based UI patterns
- **Derived state** - Computing values from other state
- **Form validation** - Client-side validation patterns
- **Reusable layouts** - Building component wrappers
- **Custom events** - Cross-component communication
- **localStorage** - Browser storage integration

These patterns are essential for building real-world React applications. Keep practicing and building!

---

_This guide builds on [HOME_PAGE_GUIDE.md](./HOME_PAGE_GUIDE.md) and focuses on intermediate concepts. For basics, refer to the home page guide first._

