# iOS-Style CSS Snippets for Aurora Dashboard

Copy-paste ready CSS to implement iOS design patterns.

---

## CSS Variables (Design Tokens)

```css
:root {
  /* iOS System Colors (Dark Mode) */
  --system-blue: #0A84FF;
  --system-green: #30D158;
  --system-orange: #FF9F0A;
  --system-red: #FF453A;
  --system-purple: #BF5AF2;
  --system-pink: #FF375F;
  --system-teal: #64D2FF;

  /* iOS Gray Scale (Dark Mode) */
  --system-gray: #8E8E93;
  --system-gray-2: #636366;
  --system-gray-3: #48484A;
  --system-gray-4: #3A3A3C;
  --system-gray-5: #2C2C2E;
  --system-gray-6: #1C1C1E;

  /* Label Colors */
  --label-primary: #FFFFFF;
  --label-secondary: rgba(255, 255, 255, 0.6);
  --label-tertiary: rgba(255, 255, 255, 0.3);
  --label-quaternary: rgba(255, 255, 255, 0.18);

  /* Surface Colors */
  --surface-base: #000000;
  --surface-elevated: rgba(255, 255, 255, 0.05);
  --surface-elevated-2: rgba(255, 255, 255, 0.08);
  --surface-elevated-3: rgba(255, 255, 255, 0.12);

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Radii */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 24px;

  /* Timing */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;
  --font-mono: 'SF Mono', 'JetBrains Mono', monospace;
}
```

---

## Card Component

```css
.ios-card {
  background: var(--surface-elevated);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);

  /* No border - depth from background */
  border: none;

  /* Subtle shadow for depth */
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);

  /* Smooth transitions */
  transition:
    transform var(--duration-fast) var(--ease-out-expo),
    box-shadow var(--duration-fast) var(--ease-out-expo);
}

.ios-card:hover {
  transform: scale(1.01);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.ios-card:active {
  transform: scale(0.99);
}
```

---

## Stat Display

```css
.ios-stat {
  text-align: center;
}

.ios-stat-value {
  font-size: 64px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--label-primary);
  font-variant-numeric: tabular-nums;
}

.ios-stat-unit {
  font-size: 24px;
  font-weight: 500;
  color: var(--label-secondary);
  margin-top: var(--space-xs);
}

.ios-stat-label {
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--label-tertiary);
  margin-top: var(--space-sm);
}

/* Trend indicator */
.ios-stat-trend {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 15px;
  font-weight: 600;
  color: var(--system-green);
  margin-top: var(--space-sm);
}

.ios-stat-trend.negative {
  color: var(--system-red);
}
```

---

## Button

```css
.ios-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);

  padding: 14px 24px;
  border-radius: var(--radius-md);
  border: none;

  font-family: var(--font-family);
  font-size: 17px;
  font-weight: 600;

  cursor: pointer;
  transition:
    transform var(--duration-fast) var(--ease-out-expo),
    opacity var(--duration-fast) var(--ease-out-expo);
}

.ios-button-primary {
  background: var(--system-green);
  color: #000;
}

.ios-button-secondary {
  background: var(--surface-elevated-2);
  color: var(--label-primary);
}

.ios-button:hover {
  opacity: 0.9;
}

.ios-button:active {
  transform: scale(0.97);
  opacity: 0.8;
}

.ios-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

---

## Progress Bar

```css
.ios-progress {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.ios-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--system-green), #4ADE80);
  transition: width var(--duration-slow) var(--ease-out-expo);
}

/* Animated shimmer effect */
.ios-progress-fill.animated {
  background: linear-gradient(
    90deg,
    var(--system-green) 0%,
    #5AEEA0 50%,
    var(--system-green) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s linear infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## Tab Navigation

```css
.ios-tabs {
  display: flex;
  gap: var(--space-lg);
  border-bottom: 1px solid var(--system-gray-5);
  position: relative;
}

.ios-tab {
  padding: var(--space-md) 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--label-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-out-expo);
}

.ios-tab:hover {
  color: var(--label-primary);
}

.ios-tab.active {
  color: var(--label-primary);
}

/* Sliding underline indicator */
.ios-tabs-indicator {
  position: absolute;
  bottom: -1px;
  height: 2px;
  background: var(--label-primary);
  border-radius: 1px;
  transition:
    left var(--duration-normal) var(--ease-out-expo),
    width var(--duration-normal) var(--ease-out-expo);
}
```

---

## Status Badge

```css
.ios-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  text-transform: capitalize;
}

.ios-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.ios-badge.ready {
  background: rgba(48, 209, 88, 0.15);
  color: var(--system-green);
}
.ios-badge.ready .ios-badge-dot {
  background: var(--system-green);
  box-shadow: 0 0 8px var(--system-green);
}

.ios-badge.beta {
  background: rgba(255, 159, 10, 0.15);
  color: var(--system-orange);
}
.ios-badge.beta .ios-badge-dot {
  background: var(--system-orange);
  box-shadow: 0 0 8px var(--system-orange);
}

.ios-badge.active {
  background: rgba(191, 90, 242, 0.15);
  color: var(--system-purple);
}
.ios-badge.active .ios-badge-dot {
  background: var(--system-purple);
  box-shadow: 0 0 8px var(--system-purple);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.9); }
}
```

---

## Apple Intelligence Glow Effect

```css
.ai-glow {
  position: relative;
}

.ai-glow::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(
    45deg,
    rgba(255, 100, 130, 0.4),
    rgba(130, 100, 255, 0.4),
    rgba(100, 200, 255, 0.4)
  );
  filter: blur(20px);
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-out-expo);
  z-index: -1;
}

.ai-glow:hover::before,
.ai-glow.active::before {
  opacity: 1;
}

/* Animated aurora for active AI states */
.ai-glow.processing::before {
  opacity: 1;
  animation: aurora 3s ease-in-out infinite;
}

@keyframes aurora {
  0%, 100% {
    background: linear-gradient(
      45deg,
      rgba(255, 100, 130, 0.4),
      rgba(130, 100, 255, 0.4),
      rgba(100, 200, 255, 0.4)
    );
  }
  33% {
    background: linear-gradient(
      45deg,
      rgba(130, 100, 255, 0.4),
      rgba(100, 200, 255, 0.4),
      rgba(255, 100, 130, 0.4)
    );
  }
  66% {
    background: linear-gradient(
      45deg,
      rgba(100, 200, 255, 0.4),
      rgba(255, 100, 130, 0.4),
      rgba(130, 100, 255, 0.4)
    );
  }
}
```

---

## Card Entrance Animation

```css
.ios-card-animate {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  animation: cardEnter var(--duration-slow) var(--ease-out-expo) forwards;
}

/* Stagger children */
.ios-card-animate:nth-child(1) { animation-delay: 0ms; }
.ios-card-animate:nth-child(2) { animation-delay: 50ms; }
.ios-card-animate:nth-child(3) { animation-delay: 100ms; }
.ios-card-animate:nth-child(4) { animation-delay: 150ms; }
.ios-card-animate:nth-child(5) { animation-delay: 200ms; }

@keyframes cardEnter {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

---

## Stat Counter Animation (JS)

```javascript
function animateCounter(element, targetValue, duration = 1500) {
  const startValue = 0;
  const startTime = performance.now();

  // Ease-out cubic for natural deceleration
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutCubic(progress);

    const currentValue = startValue + (targetValue - startValue) * easedProgress;

    // Format based on whether it's a decimal or integer
    if (targetValue % 1 !== 0) {
      element.textContent = currentValue.toFixed(1);
    } else {
      element.textContent = Math.round(currentValue);
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// Usage
document.querySelectorAll('.ios-stat-value').forEach(el => {
  const target = parseFloat(el.dataset.value);
  animateCounter(el, target);
});
```

---

## Usage Example

```html
<div class="ios-card ios-card-animate ai-glow">
  <div class="ios-stat">
    <div class="ios-stat-value" data-value="292.5">0</div>
    <div class="ios-stat-unit">hours</div>
    <div class="ios-stat-label">Total Time Saved</div>
    <div class="ios-stat-trend">
      <svg><!-- arrow up icon --></svg>
      +35.8%
    </div>
  </div>
</div>
```
