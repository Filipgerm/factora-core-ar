# User Onboarding API Documentation

This document describes the API endpoints for the user onboarding process in the Factora application.

## Base URL
```
http://localhost:8000/onboarding
```

## Overview

The onboarding process follows these steps:
1. **Phone Verification**: User enters phone number with country code, receives SMS with 4-digit code
2. **Email Verification**: User enters email, receives email with 6-digit code
3. **Business Country Selection**: User selects their business country
4. **Future Steps**: Additional onboarding steps will be added later

## Endpoints

### 1. Get Country Codes
**GET** `/country-codes`

Returns all available country codes with dialing codes and flag emojis for phone number selection.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": ["+30", "🇬🇷"],
      "name": "Greece"
    },
    {
      "code": ["+1", "uk"],
      "name": "United Kingdom"
    }
  ]
}
```

### 2. Get Countries
**GET** `/countries`

Returns all available countries for business registration.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "GREECE",
      "name": "Greece"
    },
    {
      "code": "UNITED_STATES",
      "name": "United States"
    }
  ]
}
```

### 3. Initiate Phone Verification
**POST** `/phone/verify`

Sends an SMS with a 4-digit verification code to the specified phone number.

**Request Body:**
```json
{
  "country_code": "+30 🇬🇷",
  "phone_number": "123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "verification_id": "abc123def456..."
}
```

**Notes:**
- `country_code` must be one of the values from `/country-codes`
- `phone_number` should not include the country code
- The full phone number is automatically constructed as `country_code + phone_number`

### 4. Verify Phone Code
**POST** `/phone/verify-code`

Verifies the SMS verification code submitted by the user.

**Request Body:**
```json
{
  "verification_id": "abc123def456...",
  "code": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone number verified successfully",
  "phone_number": "+30123456789"
}
```

**Notes:**
- `verification_id` is returned from the previous `/phone/verify` call
- `code` must be exactly 4 digits
- Verification codes expire after 10 minutes

### 5. Initiate Email Verification
**POST** `/email/verify`

Sends an email with a 6-digit verification code to the specified email address.

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone_number": "+30123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "verification_id": "xyz789abc123..."
}
```

**Notes:**
- `phone_number` must be the verified phone number from step 3
- `email` must be a valid email format
- Verification codes expire after 15 minutes

### 6. Verify Email Code
**POST** `/email/verify-code`

Verifies the email verification code submitted by the user.

**Request Body:**
```json
{
  "verification_id": "xyz789abc123...",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "email": "user@example.com"
}
```

**Notes:**
- `verification_id` is returned from the previous `/email/verify` call
- `code` must be exactly 6 digits

### 7. Set Business Country
**POST** `/business-country`

Sets the business country for the user. Requires the verified phone number in the header.

**Request Headers:**
```
X-Verified-Phone: +30123456789
```

**Request Body:**
```json
{
  "country": "GREECE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Business country set to Greece",
  "country": "Greece"
}
```

**Notes:**
- `country` must be one of the values from `/countries`
- The `X-Verified-Phone` header is required and must contain the verified phone number
- This endpoint will create or update the user record in the database

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400 Bad Request`: Invalid request data or missing required fields
- `500 Internal Server Error`: Server-side error

## Testing

You can test the endpoints using the provided test script:

```bash
cd backend
python test_onboarding.py
```

## Future Enhancements

The following endpoints are planned for future onboarding steps:
- `/shareholder-info` - Set shareholder information (name, etc.)
- `/company-info` - Set company information
- `/complete-onboarding` - Mark onboarding as complete

## Database Collections

The onboarding system uses the following MongoDB collections:
- `verification_sessions`: Stores verification codes and sessions
- `onboarding_users`: Stores user information during onboarding

## Security Notes

- Verification codes are randomly generated and expire automatically
- Phone numbers are validated before sending SMS
- Email addresses are validated before sending verification emails
- All verification sessions are tracked and can only be used once
- The system prevents duplicate user registrations

## Integration Notes

### SMS Service
Currently, the SMS service logs messages for development. In production, integrate with:
- Twilio
- AWS SNS
- Other SMS providers

### Email Service
Currently, the email service sends emails normally for development. In production, integrate with:
- Brevo (Currently Used)
- SendGrid
- AWS SES
- Other email providers

### Environment Variables
Add the following to your `.env` file for production SMS/email services:

```env
# SMS Service (BREVO)
BREVO_SMTP_API_KEY=<your-brevo-smtp-api-key>
BREVO_SENDER_EMAIL=<your-sender-email>
BREVO_SENDER_NAME=<your-sender-name>
BREVO_SENDER_NUMBER=""
```

