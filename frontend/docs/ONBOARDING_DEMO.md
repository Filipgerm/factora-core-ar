# Onboarding Demo Documentation

This document describes the demo functionality implemented for the onboarding pages, which simulates user typing and choices.

## Overview

The onboarding demo provides an automated experience that simulates user interactions across the onboarding flow, including:

- Phone number entry
- Email address entry
- Business lookup and selection
- KYC verification method selection

## Features

### Demo Configuration

- **Typing Speed**: Configurable typing simulation (default: 50ms per character)
- **Navigation Delays**: Automatic progression between steps
- **Demo Data**: Pre-configured sample data for each form
- **Speed Modes**: Normal and fast-paced demo options

### Demo Selector

Access the onboarding demo selector at `/onboarding/demo-selector` with two options:

1. **Full Onboarding Demo** (~3 minutes)

   - Complete flow with all steps
   - Realistic timing and interactions

2. **Quick Demo** (~90 seconds)
   - Fast-paced demonstration
   - Accelerated timing for quick overview

### Demo Navigation

- Automatic progression between onboarding steps
- Preserves demo parameters across navigation
- Configurable timing based on demo mode
- Smooth transitions with proper loading states

## Implementation Details

### Files Created/Modified

#### New Files:

- `app/(onboarding)/onboarding/demo-config.ts` - Demo configuration and utilities
- `app/(onboarding)/onboarding/demo-navigation.tsx` - Navigation logic for demo mode
- `app/(onboarding)/onboarding/demo-selector/page.tsx` - Demo selector interface

#### Modified Files:

- `app/(onboarding)/onboarding/phone/PhoneForm.tsx` - Added phone number typing simulation
- `app/(onboarding)/onboarding/email/EmailForm.tsx` - Added email typing simulation
- `app/(onboarding)/onboarding/business/BusinessLookupForm.tsx` - Added VAT search and selection simulation
- `app/(onboarding)/onboarding/kyc/KYCForm.tsx` - Added verification method selection
- `app/(onboarding)/onboarding/layout.tsx` - Integrated demo navigation
- `app/(onboarding)/onboarding/page.tsx` - Added demo mode routing

### Demo Parameters

#### URL Parameters:

- `demo=true` - Enables demo mode
- `speed=fast` - Enables fast-paced demo (optional)

#### Demo Data:

```typescript
{
  phone: {
    countryCode: "+30",
    phoneNumber: "6941234567"
  },
  email: {
    email: "demo@example.com"
  },
  business: {
    vatNumber: "099532515",
    gemiNumber: "030783729000"
  },
  kyc: {
    selectedMethod: "device"
  }
}
```

## Usage

### Starting the Demo

1. **Direct Access**:

   - Navigate to `/onboarding/demo-selector`
   - Choose between Full or Quick demo

2. **Direct Demo Mode**:
   - Navigate to `/onboarding/phone?demo=true`
   - Automatically starts the demo flow

### Demo Flow

1. **Phone Form**: Simulates dropdown interaction to select Greece, then types a Greek phone number
2. **Email Form**: Simulates typing an email address
3. **Business Form**: Simulates VAT search, displays results, and simulates clicking to select the company
4. **KYC Form**: Shows verification method selection

Each step automatically progresses to the next after a configurable delay.

## Configuration

### Timing Configuration

```typescript
const ONBOARDING_DEMO_CONFIG = {
  typingSpeed: 50, // milliseconds per character
  delayBetweenActions: 800, // milliseconds between actions
  delayBeforeNextStep: 1500, // milliseconds before moving to next step
};
```

### Speed Modes

- **Normal Mode**: Standard timing for realistic experience
- **Fast Mode**: 50% faster timing for quick demonstrations

## Integration Notes

The onboarding demo:

- Maintains consistent styling and user experience
- Follows standard demo parameter conventions (`demo=true`, `speed=fast`)
- Provides automated user interaction simulation

## Future Enhancements

Potential improvements for the onboarding demo:

- Additional form steps (country selection, shareholders, etc.)
- More realistic typing patterns with pauses
- Error simulation and recovery flows
- Customizable demo data
- Progress indicators and timing controls
