# Debugging Guide for AI Marathon Training App

## Pre-Flight Checks

### 1. Environment Variables
Ensure these are set in your Convex dashboard:
```bash
GOOGLE_AI_API_KEY=your_api_key_here
```

**To check:**
- Go to Convex dashboard → Settings → Environment Variables
- Verify `GOOGLE_AI_API_KEY` is set and valid

### 2. Dependencies
Verify all packages are installed:
```bash
npm install
```

### 3. Convex Development Server
Start Convex in a separate terminal:
```bash
npx convex dev
```

### 4. Next.js Development Server
Start Next.js:
```bash
npm run dev
```

## Testing the Plan Generation

### Step 1: Test User Setup
1. Sign in to the app via Clerk
2. Complete onboarding (or ensure `onboardingComplete: true`)
3. Verify user has `autoStats` with `best5K` value
4. Check user has `fitnessLevel` set

### Step 2: Test Plan Generation
1. Navigate to `/dashboard`
2. Click "Build My Marathon Plan"
3. Enter:
   - Marathon date: At least 12 weeks from today
   - Days per week: 3, 4, 5, or 6
4. Click "Generate Plan"

### Step 3: Monitor Logs

#### Convex Logs
Watch for these log messages:
```
[ai:generateFullMarathonPlan] Generating chunk: Base Phase (weeks 1-4 of 16)
[ai:generateFullMarathonPlan] Throttling: Waiting 10 seconds before next chunk...
```

#### Error Patterns to Watch For

**1. API Key Issues:**
```
Error: GOOGLE_AI_API_KEY environment variable is not set
```
**Fix:** Set the environment variable in Convex dashboard

**2. Model Not Found:**
```
Error: Model 'gemini-2.5-flash-lite' not found
```
**Fix:** Check if the model name is correct. Try `gemini-2.0-flash-lite` or `gemini-2.5-flash` as fallback

**3. JSON Parse Errors:**
```
JSON parse error for weeks 1-4: Unexpected token...
```
**Check logs for:**
- Response length (should be substantial for 28 items)
- First 500 chars preview
- Last 200 chars preview

**4. Structured Output Not Supported:**
```
Error: JSON mode is not enabled for this model
```
**Fix:** The model doesn't support structured output. Switch to a supported model.

**5. Token Limit Issues:**
```
Invalid chunk size: expected 28 days, got 12
```
**Fix:** The response was truncated. This indicates:
- `maxOutputTokens` might be too low (currently 8192)
- Prompt might be too long
- Model might have token limits

### Step 4: Debug JSON Response

If you see JSON parse errors, check the Convex logs for:
1. **Response length** - Should be > 1000 chars for 28 items
2. **Response preview** - First 500 chars should show valid JSON array start
3. **Response ending** - Last 200 chars should show proper closing `}]`

**Common Issues:**

**Missing Closing Brace:**
```json
... "day": 12]
```
**Expected:**
```json
... "day": 12}]
```

**Double Closing Braces:**
```json
... "day": 12}}]
```
**Expected:**
```json
... "day": 12}]
```

**Markdown Wrapper:**
```markdown
```json
[{...}]
```
```
**Fix:** Code automatically strips this

### Step 5: Test Edge Cases

1. **Very Long Plan (20+ weeks):**
   - Test with marathon date 20 weeks away
   - Should generate multiple chunks
   - Watch for throttling delays (10 seconds between chunks)

2. **Short Plan (12 weeks):**
   - Minimum required
   - Should generate 3 chunks (weeks 1-4, 5-8, 9-12)

3. **Invalid Input:**
   - Marathon date < 12 weeks → Should show error
   - Missing days per week → Button disabled

## Debugging Checklist

### Before Testing:
- [ ] Convex dev server running
- [ ] Next.js dev server running
- [ ] User logged in
- [ ] User has completed onboarding
- [ ] `GOOGLE_AI_API_KEY` set in Convex

### During Testing:
- [ ] Watch Convex logs for errors
- [ ] Check browser console for errors
- [ ] Verify progress updates (Phase information)
- [ ] Monitor network tab for API calls

### Common Issues:

#### Issue: "User not found"
**Cause:** User record doesn't exist in Convex
**Fix:** Complete onboarding flow

#### Issue: "Failed to parse structured JSON"
**Cause:** Model returned invalid JSON
**Check:**
1. Convex logs for full response
2. Response length (might be truncated)
3. Model supports structured output
**Fix:** 
- Check if model supports JSON mode
- Verify schema format
- Check token limits

#### Issue: "Invalid chunk size: expected 28 days, got X"
**Cause:** Response truncated or incomplete
**Fix:**
- Response is padded if > 25% complete
- Check `maxOutputTokens` setting
- Verify model isn't hitting limits

#### Issue: Plan generation hangs
**Cause:** Throttling delay or API timeout
**Fix:**
- Wait for 10-second throttling delays
- Check Convex timeout settings (should be > 180 seconds)
- Verify API key is valid

## Manual Testing Script

1. **Open browser console:**
   ```javascript
   // Check current user
   // Should see user object with _id, fitnessLevel, etc.
   ```

2. **Test plan generation:**
   - Click "Build My Marathon Plan"
   - Enter valid marathon date
   - Select days per week
   - Click "Generate Plan"
   - Watch for progress updates

3. **Verify generated plan:**
   - Check dashboard shows "Today's Workout"
   - Verify workout has all required fields
   - Check "Start Run" button works

## Success Criteria

✅ Plan generates without errors  
✅ All chunks complete (no truncation)  
✅ Progress updates show phase information  
✅ "Today's Workout" displays correctly  
✅ Plan data is valid (all required fields present)  

## Getting Help

If issues persist:

1. **Check Convex Logs:**
   - Full error messages
   - Response previews
   - Generation progress

2. **Check Browser Console:**
   - Client-side errors
   - Network request failures

3. **Verify API Key:**
   - Test API key works with Google's API directly
   - Check quota limits

4. **Model Compatibility:**
   - Verify `gemini-2.5-flash-lite` supports structured output
   - Try alternative models if needed

## Notes

- The app uses 10-second throttling between chunks to respect free tier limits
- Structured output should prevent most JSON parsing errors
- Repair logic is a safety net (should be rare to trigger)
- All errors are logged with detailed context for debugging
