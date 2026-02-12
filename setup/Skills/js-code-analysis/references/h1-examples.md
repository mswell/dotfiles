# HackerOne JS Code Analysis Examples

This document provides a reference of real-world vulnerabilities found through JavaScript code analysis, categorized by vulnerability type.

## 1. Information Disclosure & Secrets in JS

### [H1 #998398](https://hackerone.com/reports/998398) - Hardcoded Credentials
- **Description:** Discovery of hardcoded credentials within a JavaScript file, leading to unauthorized access.
- **Key Takeaway:** Always scan JS files for API keys, passwords, and sensitive tokens.

### [H1 #1130874](https://hackerone.com/reports/1130874) - Sensitive Information Disclosure
- **Description:** Sensitive data leaked through client-side JavaScript files.
- **Key Takeaway:** Developers often leave debugging information or internal paths in production JS.

### [H1 #152407](https://hackerone.com/reports/152407) - Information Disclosure
- **Description:** Disclosure of sensitive information in JS files.
- **Key Takeaway:** Use automated tools to find patterns of sensitive data.

## 2. Client-Side Vulnerabilities (XSS & Open Redirect)

### [H1 #311283](https://hackerone.com/reports/311283) - DOM-based XSS
- **Description:** A classic DOM XSS where user input from the URL was unsafely handled by a JS function.
- **Key Takeaway:** Trace `location.search`, `location.hash`, and `document.referrer` to sinks like `innerHTML` or `eval()`.

### [H1 #158219](https://hackerone.com/reports/158219) - Open Redirect via JS
- **Description:** Open redirect vulnerability caused by insecure handling of URL parameters in client-side logic.
- **Key Takeaway:** Validate all redirect targets, even when handled entirely in JS.

### [H1 #1276163](https://hackerone.com/reports/1276163) - DOM XSS in JS
- **Description:** Another instance of DOM XSS found by analyzing how JS processes external input.
- **Key Takeaway:** Complex JS frameworks can hide simple injection points.

## 3. Logic Flaws & API Exposure

### [H1 #141956](https://hackerone.com/reports/141956) - API Key Disclosure
- **Description:** Exposure of sensitive API keys in public-facing JavaScript.
- **Key Takeaway:** Distinguish between public API keys (like Google Maps) and private ones that shouldn't be client-side.

### [H1 #341144](https://hackerone.com/reports/341144) - Logic Flaw in JS
- **Description:** A business logic flaw that was identifiable by reading the client-side validation logic.
- **Key Takeaway:** Client-side "security" checks can often be bypassed or reveal how the server expects data.

### [H1 #162351](https://hackerone.com/reports/162351) - Insecure JS Implementation
- **Description:** General insecure implementation of features within JavaScript.
- **Key Takeaway:** Look for "hidden" features or administrative panels referenced in JS.

## 4. Prototype Pollution & Advanced JS

### [H1 #214393](https://hackerone.com/reports/214393) - Prototype Pollution
- **Description:** Vulnerability allowing an attacker to modify the prototype of base objects.
- **Key Takeaway:** Search for recursive merges or object assignments using user-controlled keys.

### [H1 #1499063](https://hackerone.com/reports/1499063) - Prototype Pollution in JS Library
- **Description:** Prototype pollution found in a widely used JS library, affecting multiple applications.
- **Key Takeaway:** Third-party libraries are a major source of JS vulnerabilities.

### [H1 #231053](https://hackerone.com/reports/231053) - Client-side Bypass
- **Description:** Bypassing security controls by manipulating the client-side JS state.
- **Key Takeaway:** Never trust the client to enforce security boundaries.
