# Mumbai Map Integration - Testing Guide

## Quick Start

1. **Start the server:**
   ```bash
   npm run dev
   ```
   This starts both:
   - Backend server on `http://localhost:5000`
   - Frontend dev server on `http://localhost:3000`

2. **Open your browser:**
   Navigate to `http://localhost:3000/map`

## Expected Behavior

### ✅ Map Should Load
- Mumbai map centered at coordinates (19.0760°N, 72.8777°E)
- Zoom level 11 (neighborhood-level view)
- OpenStreetMap tiles visible
- Map is interactive (you can pan and zoom)

### ✅ Click Functionality
1. Click anywhere on the Mumbai map
2. You should see:
   - A loading overlay with "Fetching AQI data..." message
   - A custom marker appears at the clicked location (color-coded pin)
   - A popup displays with:
     - Location name (e.g., "Bandra, Mumbai")
     - AQI value (large number in colored circle)
     - AQI category (Good, Moderate, Unhealthy, etc.)
     - Station information
     - Pollutant breakdown (PM2.5, PM10, O₃, NO₂, SO₂, CO)
     - Last updated timestamp

### ✅ AQI Color Coding
- **Green (#10b981)**: AQI 0-50 (Good)
- **Yellow (#f59e0b)**: AQI 51-100 (Moderate)
- **Orange (#f97316)**: AQI 101-150 (Unhealthy for Sensitive Groups)
- **Red (#ef4444)**: AQI 151-200 (Unhealthy)
- **Purple (#a855f7)**: AQI 201-300 (Very Unhealthy)
- **Maroon (#7f1d1d)**: AQI 301+ (Hazardous)

## Troubleshooting

### Map Doesn't Load

**Issue:** Blank map or error message "Map library failed to load"

**Solutions:**
1. Check browser console for errors (F12 → Console tab)
2. Verify internet connection (Leaflet loads from CDN)
3. Check if Leaflet is blocked by ad blocker
4. Verify `client/index.html` has Leaflet scripts:
   ```html
   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" ... />
   <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" ...></script>
   ```

### AQI Data Not Loading

**Issue:** Clicking map shows error or no data

**Possible Causes:**

1. **WAQI Demo Token Rate Limit**
   - The demo token has limited requests
   - **Solution:** Get your own token from https://aqicn.org/api/
   - Update `client/src/utils/AqiService.js` line 9:
     ```javascript
     this.waqiToken = 'YOUR_TOKEN_HERE';
     ```

2. **CORS Issues**
   - Check browser console for CORS errors
   - WAQI API should support CORS, but verify

3. **Network Issues**
   - Check if `https://api.waqi.info` is accessible
   - Check if `https://nominatim.openstreetmap.org` is accessible

4. **No Station at Location**
   - The service will try to find nearest Mumbai station
   - If no stations available, you'll see an error message

### Map Shows But No Click Response

**Issue:** Map loads but clicking does nothing

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify `LeafletMapView.js` is properly imported in `Map.js`
3. Check if click events are being captured (add console.log in `handleMapClick`)

### Styling Issues

**Issue:** Map or popup looks broken

**Solutions:**
1. Verify `leaflet-map.css` is loaded
2. Check browser DevTools → Network tab for CSS file
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

## Browser Console Checks

Open browser DevTools (F12) and check:

### Expected Console Messages (Normal)
- No errors when page loads
- No errors when clicking map
- API calls visible in Network tab:
  - `feed/geo:...` (WAQI API)
  - `reverse?format=json...` (Nominatim)

### Error Messages to Watch For

1. **"Leaflet library not loaded"**
   - Leaflet CDN failed to load
   - Check internet connection

2. **"Failed to fetch AQI data"**
   - WAQI API request failed
   - Check API token or rate limits

3. **CORS errors**
   - API doesn't allow cross-origin requests
   - Should not happen with WAQI/Nominatim

4. **"No AQI stations found in Mumbai"**
   - Fallback search failed
   - May indicate API issues

## Manual Testing Checklist

- [ ] Map loads on `/map` route
- [ ] Map is centered on Mumbai
- [ ] Can pan the map
- [ ] Can zoom in/out
- [ ] Click anywhere shows loading state
- [ ] Marker appears at clicked location
- [ ] Popup displays with AQI data
- [ ] AQI value is displayed
- [ ] AQI category is correct
- [ ] Color matches AQI value
- [ ] Location name is shown
- [ ] Station info is displayed
- [ ] Pollutant data shows (if available)
- [ ] Error message shows if API fails
- [ ] Mobile responsive (test on mobile or resize browser)

## API Testing

### Test WAQI API Directly

Open in browser:
```
https://api.waqi.info/feed/geo:19.0760;72.8777/?token=demo
```

Should return JSON with AQI data.

### Test Nominatim (Reverse Geocoding)

Open in browser:
```
https://nominatim.openstreetmap.org/reverse?format=json&lat=19.0760&lon=72.8777&zoom=16
```

Should return location name.

## Performance Checks

1. **Debouncing:** Click rapidly multiple times - only one API call should fire
2. **Loading State:** Loading overlay should appear immediately on click
3. **Error Recovery:** If API fails, error should show and auto-hide after 3 seconds
4. **Memory:** Navigate away from map and back - no memory leaks (check in DevTools → Memory)

## Common Issues & Fixes

### Issue: "Map library failed to load"
**Fix:** The component now waits up to 1 second for Leaflet to load. If still failing:
- Check CDN is accessible
- Try hard refresh (Ctrl+Shift+R)
- Check browser console for network errors

### Issue: AQI always shows "N/A" or null
**Fix:** 
- WAQI demo token may be rate-limited
- Get production token from https://aqicn.org/api/
- Update token in `AqiService.js`

### Issue: Map tiles don't load
**Fix:**
- OpenStreetMap tiles load from external CDN
- Check internet connection
- Verify no firewall blocking `*.tile.openstreetmap.org`

## Success Criteria

✅ Map loads and displays Mumbai
✅ Clicking map triggers AQI fetch
✅ AQI data displays correctly
✅ Marker and popup appear
✅ Error handling works
✅ Mobile responsive
✅ No console errors
✅ Performance is acceptable (< 2s for AQI fetch)

## Next Steps if Working

1. **Get Production WAQI Token:**
   - Register at https://aqicn.org/api/
   - Replace demo token in `AqiService.js`

2. **Optional Enhancements:**
   - Cache AQI data for recently clicked locations
   - Add multiple markers with comparison
   - Show historical trends
   - Add heatmap overlay

## Support

If issues persist:
1. Check browser console for specific errors
2. Verify all files are saved correctly
3. Restart dev server (`npm run dev`)
4. Clear browser cache
5. Try in incognito/private mode (rules out extensions)
