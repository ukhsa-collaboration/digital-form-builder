# Session Timeout Query Parameter Preservation Solution

## Problem Statement

When a user's session times out on a form that uses query parameters for pre-population (e.g., `?r=abc000&d=01F2`), these parameters were not preserved when redirected back to the start page after clicking "Start application again" on the timeout page.

### Root Cause

1. Initial request captures query parameters (`r`, `d`) and stores them in the session cache
2. User navigates through form pages (query params are no longer in URL)
3. Session expires and modal countdown begins
4. Modal redirects to `/timeout` endpoint via `window.location.replace()`
5. **New session is created** with a different session ID (old session has expired)
6. Old session with `r` and `d` values no longer exists in cache
7. Server cannot retrieve pre-population parameters on `/timeout` page

## Solution Architecture

### Overview

The solution uses a **timeout token pattern** similar to the existing magic link functionality, allowing pre-population parameters to be preserved across session boundaries.

### Key Components

#### 1. **CacheService Timeout Token Methods**

_File: `runner/src/server/services/cacheService.ts`_

- **`saveTimeoutTokenData(request, queryParams, token)`** - Stores pre-population parameters with a 5-minute TTL using a unique token as the cache key
- **`getTimeoutTokenData(token)`** - Retrieves pre-population parameters using the token
- **`clearTimeoutTokenData(token)`** - Removes token data after it's been used

**Cache Key Format:** `timeout_token:{token}`

#### 2. **Token Generation in View Context**

_File: `runner/src/server/plugins/views.ts`_

- On every page render, a unique timeout token is generated using `crypto.randomBytes(32).toString("hex")`
- The token is only generated if there are pre-population fields with values in the current session state
- Token data is stored in cache immediately with a 5-minute TTL
- Token is passed to all views via the template context as `timeoutToken`

#### 3. **Modal Dialog Integration**

_File: `runner/src/server/views/partials/modal-dialog.html`_

- Added `data-timeout-token="{{ timeoutToken or '' }}"` attribute to the modal dialog element
- Token is available before session timeout occurs

#### 4. **Client-Side Redirect with Token**

_File: `runner/public/static/modal-dialog.js`_

- Store timeout token in `GOVUKFrontend.modalDialog.timeoutToken` during initialization
- Modified `redirect()` function to append token as query parameter: `?timeoutToken={token}`
- Redirect URL format: `/{formId}/timeout?timeoutToken={token}`

#### 5. **Server-Side Timeout Token Resolution**

_File: `runner/src/server/plugins/router.ts`_

- `/timeout` route handler now accepts `timeoutToken` query parameter
- If token is provided:
  1. Retrieve pre-population data from cache using the token
  2. Reconstruct query string with pre-population parameters
  3. Append query string to start page URL
  4. Clear the token from cache (one-time use)
- If no token provided: render timeout page without pre-populated parameters (fallback)

## Key Design Decisions

### 1. **Why Proactive Token Generation?**

Generating the token on every page view ensures it's available when the session times out, even if the user has been idle. This is simpler than trying to generate it at timeout time when we might have already lost the session.

### 2. **Why 5-Minute TTL?**

- Session timeout is typically 25+ minutes
- Modal appears 5 minutes before timeout
- User has ~5 minutes to see the modal and click "Start application again"
- 5-minute TTL ensures the token is available for the entire countdown period

### 3. **Why Not Keep Query Params in URL?**

The magic link functionality already solved a similar problem: preserving state across session boundaries. This solution:

- Reuses the proven pattern
- Maintains consistency in the codebase
- Leverages existing infrastructure (cache keys, TTL handling)

## Regression Check

- All changes are backward compatible
- Timeout pages without tokens will still work (fallback behavior)
- Existing forms without pre-population fields are unaffected
- No database schema changes required
