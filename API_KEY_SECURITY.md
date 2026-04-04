# API Key Security Guide

## 🔐 Important: Protect Your API Keys

### Groq API Key Configuration

Your Groq API key should be stored in `backend/.env`:
```env
GROQ_API_KEY=your_actual_groq_api_key_here
```

### Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore` for a reason
2. **Never hardcode API keys** - Always use environment variables
3. **Rotate keys regularly** - Change keys every 90 days
4. **Rotate immediately if exposed** - If a key leaks, rotate it at https://console.groq.com/keys
5. **Use different keys** - Separate keys for development and production

### If You Accidentally Expose a Key

1. **Rotate immediately** at https://console.groq.com/keys
2. **Remove from Git history** using `git filter-branch` or `git filter-repo`
3. **Update your `.env`** with the new key
4. **Never push the exposed key** to remote repositories

### Checking Your .gitignore

Verify `.env` is ignored:
```bash
cat .gitignore | grep ".env"
```

Should show:
```
.env
*.env
.env.local
```

---

**Remember**: API keys are like passwords - keep them secret, keep them safe!
