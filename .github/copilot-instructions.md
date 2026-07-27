# Copilot Instructions

## 🚫 Sensitive Files — Do Not Use for Context

The following files contain sensitive or secret information and must NEVER be used
as context for suggestions, completions, or prompts:

- .env
- \*.env
- .env.\*
- secrets.\*
- credentials.\*
- private.key
- \*.pem

These files may contain:

- API keys
- Tokens
- Passwords
- Private credentials

Copilot must ignore these files entirely.

---

## ✅ Safe Alternatives

When generating code or examples:

- Use placeholder values instead of real secrets
- Refer to `.env.example` for variable names and structure
- Never infer or suggest real-looking secrets

Example:

```env
API_KEY=your-api-key-here
DATABASE_URL=your-database-url-here
```
