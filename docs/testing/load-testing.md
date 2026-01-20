# Load and Stress Testing Guide

**Document Version:** 1.0
**Last Updated:** 2025-01-20
**Document Owner:** DevOps / Site Administrator
**Related Issue:** #65
**Related Documents:** [SLOs and SLIs](../observability/slos-slis.md), [Horizontal Scaling](../scalability/horizontal-scaling.md)

---

## Table of Contents

1. [Load Testing Overview](#load-testing-overview)
2. [Types of Performance Tests](#types-of-performance-tests)
3. [Tool Options](#tool-options)
4. [Test Scenarios](#test-scenarios)
5. [k6 Implementation Guide](#k6-implementation-guide)
6. [Performance Metrics](#performance-metrics)
7. [Running Load Tests](#running-load-tests)
8. [Analyzing Results](#analyzing-results)
9. [Performance Budgets](#performance-budgets)
10. [Scalability Recommendations](#scalability-recommendations)

---

## Load Testing Overview

### Purpose

Load testing validates that MeJohnC.Org can handle expected and peak traffic loads while maintaining acceptable performance levels. This ensures a reliable user experience for portfolio visitors and admin dashboard users.

### Objectives

- **Capacity Planning**: Determine how many concurrent users the system can handle
- **Performance Validation**: Verify response times meet SLO targets under load
- **Bottleneck Identification**: Find system limitations before they affect real users
- **Regression Prevention**: Detect performance degradation in CI/CD pipeline
- **Scalability Assessment**: Understand scaling behavior and limits

### Architecture Context

MeJohnC.Org has a JAMstack architecture with these performance-critical components:

| Component | Technology | Load Considerations |
|-----------|------------|---------------------|
| **Frontend** | React 18 SPA on Netlify CDN | CDN handles static assets well |
| **API Layer** | Supabase (PostgreSQL + PostgREST) | Connection pooling, query optimization |
| **Authentication** | Clerk | Third-party rate limits |
| **CMS** | Ghost API | Content caching strategies |
| **Edge Functions** | Netlify Functions | Cold starts, memory limits |

### Key Performance Indicators

Based on our [SLOs](../observability/slos-slis.md):

| Metric | Target |
|--------|--------|
| Page Load (p95) | <= 3.0s |
| API Response (p95) | <= 500ms |
| Error Rate | < 0.1% |
| Availability | 99.9% |

---

## Types of Performance Tests

### Load Testing

**Purpose**: Validate system behavior under expected, normal traffic conditions.

```
Traffic Pattern:
Users ▲
      │    ┌────────────────────┐
      │   /                      \
      │  /                        \
      │ /                          \
      └─────────────────────────────► Time
        Ramp Up   Steady State   Ramp Down
```

**Characteristics:**
- Simulates typical daily traffic patterns
- Gradual ramp-up to target load
- Sustained load for extended period
- Validates normal operating conditions

**When to Use:**
- Before major releases
- After infrastructure changes
- Periodic baseline validation

**Example Configuration:**
```javascript
// k6 load test configuration
export const options = {
  stages: [
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '30m', target: 50 },  // Stay at 50 users
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% under 3s
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
  },
};
```

### Stress Testing

**Purpose**: Determine system behavior beyond normal capacity and identify breaking points.

```
Traffic Pattern:
Users ▲
      │                    ╱ Breaking Point
      │                  ╱ ←
      │                ╱
      │              ╱
      │            ╱
      │          ╱
      │        ╱
      │      ╱
      └────────────────────────────► Time
        Continuous ramp until failure
```

**Characteristics:**
- Progressively increases load until failure
- Identifies breaking points and failure modes
- Tests recovery behavior
- Exposes hidden bottlenecks

**When to Use:**
- Capacity planning
- Before expected traffic spikes (e.g., product launch)
- After significant architecture changes

**Example Configuration:**
```javascript
// k6 stress test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Baseline
    { duration: '5m', target: 100 },  // Normal peak
    { duration: '5m', target: 200 },  // Above capacity
    { duration: '5m', target: 300 },  // Breaking point?
    { duration: '5m', target: 400 },  // Well above capacity
    { duration: '5m', target: 0 },    // Recovery
  ],
};
```

### Spike Testing

**Purpose**: Validate system response to sudden, dramatic traffic increases.

```
Traffic Pattern:
Users ▲
      │         ┌─┐
      │         │ │
      │         │ │
      │   ┌─────┘ └─────┐
      │   │             │
      └───────────────────────────► Time
        Normal → Spike → Normal
```

**Characteristics:**
- Sudden traffic surge (10x or more)
- Short duration spikes
- Tests auto-scaling responsiveness
- Validates circuit breakers and rate limiting

**When to Use:**
- Simulating viral content scenarios
- Testing promotional campaign traffic
- Validating DDoS mitigation

**Example Configuration:**
```javascript
// k6 spike test configuration
export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Normal load
    { duration: '30s', target: 200 }, // Spike!
    { duration: '2m', target: 200 },  // Sustain spike
    { duration: '30s', target: 20 },  // Return to normal
    { duration: '5m', target: 20 },   // Recovery monitoring
  ],
};
```

### Soak Testing (Endurance Testing)

**Purpose**: Identify issues that emerge only under sustained load over extended periods.

```
Traffic Pattern:
Users ▲
      │   ┌──────────────────────────────┐
      │  /                                \
      │ /                                  \
      └────────────────────────────────────► Time
        Extended period (hours to days)
```

**Characteristics:**
- Moderate load over extended duration (4-24+ hours)
- Detects memory leaks
- Identifies connection pool exhaustion
- Reveals gradual performance degradation

**When to Use:**
- Pre-production validation
- After memory-related bug fixes
- Quarterly reliability validation

**Example Configuration:**
```javascript
// k6 soak test configuration
export const options = {
  stages: [
    { duration: '5m', target: 30 },     // Ramp up
    { duration: '4h', target: 30 },     // Soak for 4 hours
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<5000'],  // 99% under 5s
    http_req_failed: ['rate<0.001'],    // Very low error rate
  },
};
```

### Test Type Comparison

| Type | Duration | Load Pattern | Primary Goal |
|------|----------|--------------|--------------|
| **Load** | 30-60 min | Steady at expected load | Validate normal operation |
| **Stress** | 20-40 min | Progressive increase | Find breaking point |
| **Spike** | 10-15 min | Sudden surge | Test elasticity |
| **Soak** | 4-24+ hours | Sustained moderate | Find memory leaks |

---

## Tool Options

### k6 (Recommended)

**Why k6 is recommended for MeJohnC.Org:**

| Feature | Benefit |
|---------|---------|
| **JavaScript/TypeScript** | Matches our tech stack |
| **CLI-based** | Easy CI/CD integration |
| **Low resource footprint** | Can run on dev machines |
| **Grafana Cloud integration** | Aligns with monitoring stack |
| **Built-in metrics** | Response times, throughput, errors |
| **Thresholds** | Automated pass/fail criteria |

**Installation:**
```bash
# macOS
brew install k6

# Windows (Chocolatey)
choco install k6

# Windows (winget)
winget install k6

# Docker
docker pull grafana/k6
```

**Basic Example:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const res = http.get('https://mejohnc.org');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 3s': (r) => r.timings.duration < 3000,
  });
  sleep(1);
}
```

**Pros:**
- Modern, developer-friendly
- Excellent documentation
- Active community
- Free for local testing
- Cloud option available (Grafana Cloud k6)

**Cons:**
- No browser-based testing (use k6 browser extension for RUM)
- Learning curve for complex scenarios

### Artillery

**Overview:** YAML-first load testing tool with good Node.js integration.

**Installation:**
```bash
npm install -g artillery
```

**Basic Example:**
```yaml
# artillery-config.yml
config:
  target: 'https://mejohnc.org'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"

scenarios:
  - name: "Browse portfolio"
    flow:
      - get:
          url: "/"
      - think: 2
      - get:
          url: "/portfolio"
      - think: 3
      - get:
          url: "/about"
```

**Run:**
```bash
artillery run artillery-config.yml
```

**Pros:**
- YAML configuration (easy to read)
- Good for API testing
- Plugins ecosystem
- Built-in reporting

**Cons:**
- Higher resource usage than k6
- Less flexible scripting than k6

### Locust

**Overview:** Python-based load testing with real-time web UI.

**Installation:**
```bash
pip install locust
```

**Basic Example:**
```python
# locustfile.py
from locust import HttpUser, task, between

class PortfolioUser(HttpUser):
    wait_time = between(1, 5)

    @task(3)
    def view_homepage(self):
        self.client.get("/")

    @task(2)
    def view_portfolio(self):
        self.client.get("/portfolio")

    @task(1)
    def view_about(self):
        self.client.get("/about")
```

**Run:**
```bash
locust -f locustfile.py --host=https://mejohnc.org
```

**Pros:**
- Python-based (easy for data science tasks)
- Real-time web UI
- Distributed testing built-in
- Good for complex user behavior

**Cons:**
- Higher resource usage
- Python dependency
- Less performant than k6

### Tool Comparison Matrix

| Feature | k6 | Artillery | Locust |
|---------|-----|-----------|--------|
| **Language** | JavaScript | YAML/JS | Python |
| **Resource Usage** | Low | Medium | High |
| **CI/CD Integration** | Excellent | Good | Good |
| **Learning Curve** | Medium | Low | Low |
| **Scripting Power** | High | Medium | High |
| **Cloud Option** | Grafana Cloud k6 | Artillery Cloud | Locust Cloud |
| **Browser Testing** | Via extension | No | No |
| **Cost** | Free/Cloud paid | Free/Cloud paid | Free |
| **Best For** | API & Protocol | API & Simple | Complex behaviors |

**Recommendation for MeJohnC.Org:** Use **k6** for its JavaScript compatibility, low resource usage, and excellent CI/CD integration with GitHub Actions.

---

## Test Scenarios

### Scenario 1: Homepage Load

**Purpose:** Validate the main landing page performance under load.

**User Journey:**
1. Load homepage
2. Wait for LCP (hero content)
3. Scroll through sections
4. Click navigation links

**k6 Implementation:**
```javascript
// tests/load/homepage.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics
const homepageDuration = new Trend('homepage_duration');
const homepageErrors = new Rate('homepage_errors');

export const options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    homepage_duration: ['p(95)<2500'],
    homepage_errors: ['rate<0.01'],
  },
};

export default function () {
  group('Homepage Load', () => {
    const res = http.get('https://mejohnc.org/', {
      tags: { page: 'homepage' },
    });

    homepageDuration.add(res.timings.duration);
    homepageErrors.add(res.status !== 200);

    check(res, {
      'homepage status 200': (r) => r.status === 200,
      'homepage has title': (r) => r.body.includes('Jonathan Christensen'),
      'response time OK': (r) => r.timings.duration < 3000,
    });
  });

  sleep(Math.random() * 3 + 1); // 1-4 second think time
}
```

### Scenario 2: API Endpoint Performance

**Purpose:** Test Supabase API endpoints under load.

**Endpoints to Test:**
- `GET /rest/v1/apps` - Portfolio apps
- `GET /rest/v1/blog_posts` - Blog listing
- `GET /rest/v1/projects` - Projects listing
- `GET /rest/v1/work_history` - Experience timeline

**k6 Implementation:**
```javascript
// tests/load/api-endpoints.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';

const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 30 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration{endpoint:apps}': ['p(95)<500'],
    'http_req_duration{endpoint:blogs}': ['p(95)<500'],
    'http_req_duration{endpoint:projects}': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  group('Portfolio API', () => {
    // Apps endpoint
    const appsRes = http.get(
      `${SUPABASE_URL}/rest/v1/apps?select=*&status=eq.published`,
      { headers, tags: { endpoint: 'apps' } }
    );
    check(appsRes, {
      'apps status 200': (r) => r.status === 200,
      'apps returns array': (r) => Array.isArray(JSON.parse(r.body)),
    });

    sleep(0.5);

    // Blog posts endpoint
    const blogsRes = http.get(
      `${SUPABASE_URL}/rest/v1/blog_posts?select=*&status=eq.published&limit=10`,
      { headers, tags: { endpoint: 'blogs' } }
    );
    check(blogsRes, {
      'blogs status 200': (r) => r.status === 200,
    });

    sleep(0.5);

    // Projects endpoint
    const projectsRes = http.get(
      `${SUPABASE_URL}/rest/v1/projects?select=*&featured=eq.true`,
      { headers, tags: { endpoint: 'projects' } }
    );
    check(projectsRes, {
      'projects status 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}
```

### Scenario 3: Authentication Under Load

**Purpose:** Validate Clerk authentication flow performance.

**Note:** Clerk is a third-party service with its own rate limits. This test focuses on the application's handling of authenticated requests.

**k6 Implementation:**
```javascript
// tests/load/authenticated-flow.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';

// For authenticated tests, you'll need a test token
// IMPORTANT: Use a dedicated test account, not production credentials
const TEST_TOKEN = __ENV.TEST_CLERK_TOKEN;

export const options = {
  stages: [
    { duration: '1m', target: 5 },
    { duration: '3m', target: 10 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // Skip if no token available
  if (!TEST_TOKEN) {
    console.log('Skipping authenticated tests - no token provided');
    sleep(1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json',
  };

  group('Authenticated Admin Flow', () => {
    // Admin dashboard
    const dashboardRes = http.get('https://mejohnc.org/admin/dashboard', {
      headers,
    });
    check(dashboardRes, {
      'dashboard accessible': (r) => r.status === 200 || r.status === 302,
    });

    sleep(1);

    // Admin API endpoint
    const settingsRes = http.get('https://mejohnc.org/admin/settings', {
      headers,
    });
    check(settingsRes, {
      'settings accessible': (r) => r.status === 200 || r.status === 302,
    });
  });

  sleep(2);
}
```

**Rate Limit Considerations:**
- Clerk has rate limits on authentication endpoints
- Test with dedicated test accounts
- Do not test Clerk endpoints directly (out of scope)
- Focus on application behavior under authenticated load

### Scenario 4: Database Query Performance

**Purpose:** Test complex database queries under load.

**Critical Queries:**
- Dashboard metrics aggregation
- News article filtering
- Full-text search (if implemented)
- Audit log queries

**k6 Implementation:**
```javascript
// tests/load/database-queries.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;

const queryDuration = new Trend('query_duration');

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'count=exact', // Get row count
};

export const options = {
  stages: [
    { duration: '1m', target: 5 },
    { duration: '5m', target: 20 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    query_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Complex query: Portfolio with relations
  const portfolioRes = http.get(
    `${SUPABASE_URL}/rest/v1/apps?select=*,app_suites(name)&status=eq.published&order=sort_order`,
    { headers }
  );
  queryDuration.add(portfolioRes.timings.duration);
  check(portfolioRes, { 'portfolio query OK': (r) => r.status === 200 });

  sleep(0.5);

  // Filtered query: Blog by category
  const blogRes = http.get(
    `${SUPABASE_URL}/rest/v1/blog_posts?select=id,title,slug,excerpt,published_at&status=eq.published&order=published_at.desc&limit=20`,
    { headers }
  );
  queryDuration.add(blogRes.timings.duration);
  check(blogRes, { 'blog query OK': (r) => r.status === 200 });

  sleep(0.5);

  // Aggregation query simulation (via RPC if available)
  const statsRes = http.get(
    `${SUPABASE_URL}/rest/v1/apps?select=count&status=eq.published`,
    { headers }
  );
  queryDuration.add(statsRes.timings.duration);
  check(statsRes, { 'stats query OK': (r) => r.status === 200 });

  sleep(1);
}
```

### Scenario Summary

| Scenario | Target VUs | Duration | Key Metrics |
|----------|------------|----------|-------------|
| Homepage Load | 50 | 9 min | LCP, TTFB |
| API Endpoints | 30 | 5 min | Response time, error rate |
| Authenticated Flow | 10 | 5 min | Auth latency, error rate |
| Database Queries | 20 | 8 min | Query time, connection pool |

---

## k6 Implementation Guide

### Installation

#### macOS
```bash
brew install k6
```

#### Windows
```bash
# Chocolatey
choco install k6

# Or winget
winget install k6 --source winget

# Or download from GitHub releases
# https://github.com/grafana/k6/releases
```

#### Linux
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Docker
```bash
docker pull grafana/k6
docker run -i grafana/k6 run - <script.js
```

### Project Structure

```
MeJohnC.Org/
├── tests/
│   └── load/
│       ├── config/
│       │   ├── thresholds.js    # Shared threshold definitions
│       │   └── environments.js  # Environment configurations
│       ├── scenarios/
│       │   ├── homepage.js      # Homepage load test
│       │   ├── api.js           # API endpoint tests
│       │   ├── auth.js          # Authenticated flow tests
│       │   └── database.js      # Database query tests
│       ├── utils/
│       │   ├── helpers.js       # Shared utility functions
│       │   └── checks.js        # Common check functions
│       ├── smoke.js             # Quick smoke test
│       ├── load.js              # Full load test
│       ├── stress.js            # Stress test
│       └── soak.js              # Soak test
│   └── ...
```

### Writing Load Test Scripts

#### Basic Script Structure

```javascript
// tests/load/smoke.js
import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
export const options = {
  vus: 1,              // 1 virtual user
  duration: '30s',     // Run for 30 seconds
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95th percentile < 3s
    http_req_failed: ['rate<0.01'],     // Error rate < 1%
  },
};

// Setup function (runs once before test)
export function setup() {
  console.log('Setting up load test...');
  return { startTime: new Date().toISOString() };
}

// Main test function (runs for each VU iteration)
export default function (data) {
  const res = http.get('https://mejohnc.org/');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 3s': (r) => r.timings.duration < 3000,
    'body contains title': (r) => r.body.includes('MeJohnC'),
  });

  sleep(1); // Think time between requests
}

// Teardown function (runs once after test)
export function teardown(data) {
  console.log(`Test started at: ${data.startTime}`);
  console.log('Load test completed.');
}
```

#### Advanced Script with Multiple Scenarios

```javascript
// tests/load/load.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
const pageLoadTime = new Trend('page_load_time');
const apiCallTime = new Trend('api_call_time');
const errorRate = new Rate('errors');
const requestCount = new Counter('requests');

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'https://mejohnc.org';
const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_KEY = __ENV.SUPABASE_ANON_KEY;

export const options = {
  scenarios: {
    // Scenario 1: Browsing users
    browsers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 30 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'browserScenario',
    },
    // Scenario 2: API consumers
    api_users: {
      executor: 'constant-arrival-rate',
      rate: 50,           // 50 requests per timeUnit
      timeUnit: '1s',
      duration: '9m',
      preAllocatedVUs: 20,
      maxVUs: 50,
      exec: 'apiScenario',
    },
  },
  thresholds: {
    page_load_time: ['p(95)<3000'],
    api_call_time: ['p(95)<500'],
    errors: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

// Scenario 1: Browser-like behavior
export function browserScenario() {
  group('Page Navigation', () => {
    // Homepage
    let res = http.get(`${BASE_URL}/`);
    pageLoadTime.add(res.timings.duration);
    requestCount.add(1);
    errorRate.add(res.status !== 200);

    check(res, {
      'homepage loaded': (r) => r.status === 200,
    });

    sleep(Math.random() * 2 + 1); // 1-3s think time

    // Portfolio page
    res = http.get(`${BASE_URL}/portfolio`);
    pageLoadTime.add(res.timings.duration);
    requestCount.add(1);
    errorRate.add(res.status !== 200);

    check(res, {
      'portfolio loaded': (r) => r.status === 200,
    });

    sleep(Math.random() * 3 + 2); // 2-5s think time

    // About page
    res = http.get(`${BASE_URL}/about`);
    pageLoadTime.add(res.timings.duration);
    requestCount.add(1);

    sleep(Math.random() * 2 + 1);
  });
}

// Scenario 2: API-focused behavior
export function apiScenario() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('Supabase credentials not provided');
    return;
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  };

  group('API Calls', () => {
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/apps?select=id,name,slug&status=eq.published`,
      { headers }
    );
    apiCallTime.add(res.timings.duration);
    requestCount.add(1);
    errorRate.add(res.status !== 200);

    check(res, {
      'API response OK': (r) => r.status === 200,
      'API response fast': (r) => r.timings.duration < 500,
    });
  });

  sleep(0.1); // Minimal delay for API scenario
}
```

### Virtual Users and Iterations

#### Understanding VUs (Virtual Users)

Virtual Users simulate concurrent users making requests:

```javascript
export const options = {
  // Simple configuration
  vus: 10,           // Number of concurrent users
  duration: '1m',    // Test duration
  iterations: 100,   // Total iterations (alternative to duration)

  // Advanced: Ramping VUs
  stages: [
    { duration: '30s', target: 10 },  // Ramp to 10 VUs
    { duration: '1m', target: 10 },   // Stay at 10 VUs
    { duration: '30s', target: 50 },  // Ramp to 50 VUs
    { duration: '1m', target: 50 },   // Stay at 50 VUs
    { duration: '30s', target: 0 },   // Ramp down
  ],
};
```

#### Executors

k6 provides different executors for various testing patterns:

| Executor | Use Case |
|----------|----------|
| `shared-iterations` | Fixed number of iterations shared among VUs |
| `per-vu-iterations` | Fixed iterations per VU |
| `constant-vus` | Constant number of VUs for duration |
| `ramping-vus` | VU count changes over time |
| `constant-arrival-rate` | Fixed request rate regardless of response time |
| `ramping-arrival-rate` | Request rate changes over time |
| `externally-controlled` | Control via k6 REST API |

```javascript
export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
    },
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '30s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 10 },
      ],
    },
  },
};
```

### Thresholds and Assertions

#### Threshold Types

```javascript
export const options = {
  thresholds: {
    // Response time thresholds
    http_req_duration: [
      'p(95)<3000',      // 95th percentile under 3s
      'p(99)<5000',      // 99th percentile under 5s
      'avg<1000',        // Average under 1s
      'max<10000',       // Maximum under 10s
    ],

    // Error rate thresholds
    http_req_failed: ['rate<0.01'],  // Less than 1% errors

    // Custom metric thresholds
    my_custom_metric: ['p(95)<500'],

    // Threshold with abort
    http_req_duration: [{
      threshold: 'p(99)<5000',
      abortOnFail: true,      // Stop test if threshold fails
      delayAbortEval: '30s',  // Wait 30s before checking
    }],

    // Threshold for specific tags
    'http_req_duration{page:homepage}': ['p(95)<2000'],
    'http_req_duration{page:api}': ['p(95)<500'],
  },
};
```

#### Check Functions

```javascript
import { check, fail } from 'k6';

export default function () {
  const res = http.get('https://mejohnc.org/');

  // Basic checks (don't stop test on failure)
  const checkResult = check(res, {
    'status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body.length > 0,
    'content-type is HTML': (r) =>
      r.headers['Content-Type'].includes('text/html'),
    'response time acceptable': (r) => r.timings.duration < 3000,
  });

  // Conditional logic based on checks
  if (!checkResult) {
    console.log(`Check failed for VU ${__VU}, iteration ${__ITER}`);
  }

  // Hard fail (stops current iteration)
  if (res.status === 500) {
    fail('Server returned 500 error');
  }
}
```

### Environment Variables

```javascript
// Pass environment variables
// k6 run -e BASE_URL=https://staging.mejohnc.org script.js

const BASE_URL = __ENV.BASE_URL || 'https://mejohnc.org';
const API_KEY = __ENV.API_KEY;

export default function () {
  if (!API_KEY) {
    console.warn('API_KEY not provided, skipping authenticated tests');
    return;
  }

  const res = http.get(`${BASE_URL}/api/data`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
}
```

---

## Performance Metrics

### Response Time Percentiles

Response time percentiles provide a complete picture of performance distribution:

| Percentile | Meaning | Target (MeJohnC.Org) |
|------------|---------|----------------------|
| **p50** (Median) | 50% of requests faster than this | < 1.5s |
| **p75** | 75% of requests faster | < 2.0s |
| **p90** | 90% of requests faster | < 2.5s |
| **p95** | 95% of requests faster | < 3.0s |
| **p99** | 99% of requests faster | < 5.0s |
| **max** | Slowest request | < 10s |

**Why Percentiles Matter:**

```
Requests ▲
         │  ╭──╮
         │ ╱    ╲
         │╱      ╲        Long tail of slow requests
         │        ╲        ↓
         │         ╲___________
         └─────────────────────────► Response Time
           p50   p95   p99   max
```

The average can hide problems - a few very slow requests may indicate issues even if the average looks good.

### Throughput

**Requests Per Second (RPS):**
```
Throughput = Total Requests / Test Duration
```

**Target Throughput for MeJohnC.Org:**

| Endpoint Type | Expected RPS | Peak RPS |
|---------------|--------------|----------|
| Homepage (CDN) | 100+ | 500+ |
| API endpoints | 50 | 200 |
| Admin dashboard | 10 | 50 |

**k6 Throughput Metrics:**
- `http_reqs`: Total number of HTTP requests
- `http_req_rate`: Requests per second
- `iterations`: Total number of VU iterations

### Error Rates

**Error Categories:**

| Category | HTTP Codes | Threshold |
|----------|------------|-----------|
| Client Errors | 4xx (except 401, 404) | Track only |
| Server Errors | 5xx | < 0.1% |
| Timeout Errors | Request timeout | < 0.5% |
| Connection Errors | TCP/DNS failures | < 0.1% |

**k6 Error Metrics:**
```javascript
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export default function () {
  const res = http.get('https://mejohnc.org/');

  // Track different error types
  errorRate.add(res.status >= 400);

  // More specific tracking
  if (res.status >= 500) {
    console.log(`Server error: ${res.status}`);
  }
}
```

### Resource Utilization

While k6 measures client-side metrics, correlate with server-side monitoring:

| Resource | Tool | Alert Threshold |
|----------|------|-----------------|
| CPU | Supabase Dashboard, Netlify | > 80% sustained |
| Memory | Supabase Dashboard | > 85% |
| Database Connections | Supabase Dashboard | > 80% of pool |
| Edge Function Duration | Netlify Analytics | > 10s |
| Bandwidth | Netlify Analytics | Monitor for spikes |

**Correlation Dashboard:**

During load tests, monitor these alongside k6 metrics:
1. Supabase Dashboard - Database performance
2. Netlify Analytics - Edge performance
3. Sentry - Error spikes
4. Browser DevTools - Client-side profiling

### Custom Metrics

```javascript
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

// Trend: Statistical distributions (min, max, avg, percentiles)
const responseTime = new Trend('custom_response_time');

// Rate: Percentage of non-zero values
const errorRate = new Rate('custom_error_rate');

// Counter: Cumulative sum
const requestCount = new Counter('custom_request_count');

// Gauge: Latest value only
const activeConnections = new Gauge('custom_active_connections');

export default function () {
  const res = http.get('https://mejohnc.org/');

  responseTime.add(res.timings.duration);
  errorRate.add(res.status !== 200);
  requestCount.add(1);
  activeConnections.add(__VU); // Current VU count
}
```

---

## Running Load Tests

### Local Testing

#### Quick Smoke Test
```bash
# Run from project root
k6 run tests/load/smoke.js
```

#### Full Load Test
```bash
# With environment variables
k6 run \
  -e BASE_URL=https://mejohnc.org \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_ANON_KEY=your-anon-key \
  tests/load/load.js
```

#### Output Options
```bash
# JSON output for analysis
k6 run --out json=results.json script.js

# CSV output
k6 run --out csv=results.csv script.js

# InfluxDB (for Grafana dashboards)
k6 run --out influxdb=http://localhost:8086/k6 script.js

# Multiple outputs
k6 run --out json=results.json --out csv=results.csv script.js
```

#### Local Testing Best Practices

1. **Start with smoke tests**: Verify scripts work before running full load
2. **Use staging environment**: Don't load test production initially
3. **Monitor local resources**: k6 itself uses CPU/memory
4. **Run multiple times**: Results vary; look for patterns

### CI/CD Integration (Non-Blocking)

**GitHub Actions Workflow:**

```yaml
# .github/workflows/load-test.yml
name: Load Tests

on:
  # Manual trigger
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to test'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
      test_type:
        description: 'Type of load test'
        required: true
        default: 'smoke'
        type: choice
        options:
          - smoke
          - load
          - stress

  # Scheduled runs (non-blocking)
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6 AM UTC

  # On release (optional, non-blocking)
  release:
    types: [published]

jobs:
  load-test:
    name: Run Load Tests
    runs-on: ubuntu-latest
    # Continue even if load test fails (non-blocking)
    continue-on-error: true

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Determine test file
        id: test-file
        run: |
          case "${{ github.event.inputs.test_type || 'smoke' }}" in
            smoke) echo "file=tests/load/smoke.js" >> $GITHUB_OUTPUT ;;
            load) echo "file=tests/load/load.js" >> $GITHUB_OUTPUT ;;
            stress) echo "file=tests/load/stress.js" >> $GITHUB_OUTPUT ;;
          esac

      - name: Determine base URL
        id: base-url
        run: |
          case "${{ github.event.inputs.environment || 'staging' }}" in
            staging) echo "url=https://staging.mejohnc.org" >> $GITHUB_OUTPUT ;;
            production) echo "url=https://mejohnc.org" >> $GITHUB_OUTPUT ;;
          esac

      - name: Run k6 Load Test
        run: |
          k6 run \
            -e BASE_URL=${{ steps.base-url.outputs.url }} \
            -e SUPABASE_URL=${{ secrets.SUPABASE_URL }} \
            -e SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }} \
            --out json=results.json \
            --summary-export=summary.json \
            ${{ steps.test-file.outputs.file }}

      - name: Upload Results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: load-test-results
          path: |
            results.json
            summary.json

      - name: Post Summary to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const summary = JSON.parse(fs.readFileSync('summary.json', 'utf8'));

            const body = `## Load Test Results

            | Metric | Value |
            |--------|-------|
            | Total Requests | ${summary.metrics.http_reqs.values.count} |
            | Avg Response Time | ${Math.round(summary.metrics.http_req_duration.values.avg)}ms |
            | p95 Response Time | ${Math.round(summary.metrics.http_req_duration.values['p(95)'])}ms |
            | Error Rate | ${(summary.metrics.http_req_failed.values.rate * 100).toFixed(2)}% |

            **Status:** ${ summary.metrics.http_req_failed.values.rate < 0.01 ? ':white_check_mark: Passed' : ':warning: Check Results' }
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

  # Notify on failure (optional)
  notify:
    name: Notify on Failure
    needs: load-test
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Send Slack Notification
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: 'Load test failed - check results'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Key Points for Non-Blocking CI/CD:**
- Use `continue-on-error: true` to prevent blocking merges
- Run on schedule or manual trigger, not on every PR
- Post results as comments/artifacts for visibility
- Alert on significant degradation only

### Grafana Cloud k6

For distributed load testing and advanced analytics:

#### Setup
1. Create account at [k6.io/cloud](https://k6.io/cloud)
2. Get API token from account settings
3. Configure locally:
   ```bash
   k6 login cloud --token YOUR_TOKEN
   ```

#### Run Cloud Tests
```bash
# Run test in cloud
k6 cloud tests/load/load.js

# Run locally, stream results to cloud
k6 run --out cloud tests/load/load.js
```

#### Cloud Configuration
```javascript
export const options = {
  // Cloud-specific options
  ext: {
    loadimpact: {
      projectID: 12345,
      name: 'MeJohnC.Org Load Test',
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:ie:dublin': { loadZone: 'amazon:ie:dublin', percent: 50 },
      },
    },
  },
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};
```

**Benefits of Grafana Cloud k6:**
- Distributed load generation from multiple regions
- Built-in dashboards and analytics
- Historical comparison
- Team collaboration features
- Integration with Grafana dashboards

### Package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test:load:smoke": "k6 run tests/load/smoke.js",
    "test:load": "k6 run tests/load/load.js",
    "test:load:stress": "k6 run tests/load/stress.js",
    "test:load:soak": "k6 run tests/load/soak.js",
    "test:load:ci": "k6 run --out json=load-results.json tests/load/smoke.js"
  }
}
```

---

## Analyzing Results

### k6 Output Interpretation

#### Console Output

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: tests/load/load.js
     output: -

  scenarios: (100.00%) 1 scenario, 50 max VUs, 10m30s max duration
           default: Up to 50 looping VUs for 9m0s

running (09m00.0s), 00/50 VUs, 12847 complete and 0 interrupted iterations
default ✓ [======================================] 00/50 VUs  9m0s

     ✓ status is 200
     ✓ response time < 3s

     checks.........................: 100.00% ✓ 25694      ✗ 0
     data_received..................: 156 MB  289 kB/s
     data_sent......................: 1.5 MB  2.8 kB/s
     http_req_blocked...............: avg=2.34ms   min=0s      med=0s      max=1.23s    p(90)=0s      p(95)=0s
     http_req_connecting............: avg=1.12ms   min=0s      med=0s      max=612.34ms p(90)=0s      p(95)=0s
     http_req_duration..............: avg=312.45ms min=89.12ms med=278.34ms max=2.34s   p(90)=523.12ms p(95)=678.45ms
       { expected_response:true }...: avg=312.45ms min=89.12ms med=278.34ms max=2.34s   p(90)=523.12ms p(95)=678.45ms
     http_req_failed................: 0.00%   ✓ 0          ✗ 12847
     http_req_receiving.............: avg=45.23ms  min=0s      med=34.12ms max=456.78ms p(90)=89.34ms  p(95)=123.45ms
     http_req_sending...............: avg=0.12ms   min=0s      med=0s      max=12.34ms  p(90)=0s       p(95)=0s
     http_req_tls_handshaking.......: avg=1.23ms   min=0s      med=0s      max=612.34ms p(90)=0s       p(95)=0s
     http_req_waiting...............: avg=267.10ms min=78.90ms med=234.56ms max=1.89s   p(90)=456.78ms p(95)=567.89ms
     http_reqs......................: 12847   23.789123/s
     iteration_duration.............: avg=1.89s    min=1.12s   med=1.78s   max=4.56s    p(90)=2.34s    p(95)=2.67s
     iterations.....................: 12847   23.789123/s
     vus............................: 1       min=1        max=50
     vus_max........................: 50      min=50       max=50

THRESHOLDS
     ✓ http_req_duration: p(95)<3000
     ✓ http_req_failed: rate<0.01
```

#### Key Metrics Explained

| Metric | Description | What to Look For |
|--------|-------------|------------------|
| `http_req_duration` | Total request time | p95 < target (3s) |
| `http_req_blocked` | Time waiting for connection | High = connection issues |
| `http_req_connecting` | TCP connection time | High = network issues |
| `http_req_tls_handshaking` | TLS handshake time | High = TLS issues |
| `http_req_waiting` | Time to first byte (TTFB) | Server processing time |
| `http_req_receiving` | Time receiving response | Large responses or slow transfer |
| `http_req_failed` | Failed request rate | Should be < 1% |
| `checks` | Assertion pass rate | Should be 100% |
| `iteration_duration` | Full iteration time | Including sleep/think time |

### Identifying Bottlenecks

#### Response Time Breakdown

```
Total Duration = Blocked + Connecting + TLS + Sending + Waiting + Receiving

┌─────────┬───────────────┬────────────┬─────────┬─────────┬───────────┐
│ Blocked │  Connecting   │    TLS     │ Sending │ Waiting │ Receiving │
└─────────┴───────────────┴────────────┴─────────┴─────────┴───────────┘
          ↑                            ↑          ↑                    ↑
     DNS/Connection Pool            Handshake  Server Processing  Download
```

**Bottleneck Identification:**

| High Metric | Likely Cause | Solution |
|-------------|--------------|----------|
| `blocked` | Connection pool exhausted | Increase pool size, reduce connections |
| `connecting` | Network latency, DNS | CDN, DNS caching |
| `tls_handshaking` | TLS overhead | Connection reuse, TLS optimization |
| `waiting` | Slow server processing | Database optimization, caching |
| `receiving` | Large responses | Compression, pagination |

#### Common Patterns

**Pattern 1: Slow Database**
```
Symptoms:
- High `http_req_waiting`
- Response time increases with VUs
- Error rate increases at high load

Solution:
- Add database indexes
- Implement query caching
- Optimize N+1 queries
- Increase connection pool
```

**Pattern 2: Connection Pool Exhaustion**
```
Symptoms:
- High `http_req_blocked`
- Sudden increase in response times
- Timeouts under moderate load

Solution:
- Increase connection pool size
- Implement connection pooling (PgBouncer)
- Reduce long-running queries
```

**Pattern 3: Memory Leak**
```
Symptoms:
- Gradual performance degradation in soak tests
- Increasing response times over time
- Eventually crashes or errors

Solution:
- Profile application memory
- Review object lifecycle
- Implement proper cleanup
```

### Visualization and Reporting

#### JSON Analysis

```bash
# Run with JSON output
k6 run --out json=results.json script.js

# Parse results with jq
jq '.metrics.http_req_duration.values | {avg, min, max, "p(95)": .["p(95)"], "p(99)": .["p(99)"]}' summary.json
```

#### Grafana Dashboard

For teams using Grafana, k6 can output to InfluxDB:

```bash
# Start InfluxDB (Docker)
docker run -d -p 8086:8086 influxdb:1.8

# Run k6 with InfluxDB output
k6 run --out influxdb=http://localhost:8086/k6 script.js
```

Import the [k6 Grafana Dashboard](https://grafana.com/grafana/dashboards/2587-k6-load-testing-results/) for visualization.

#### HTML Report Generation

Use k6's JSON output with a reporting tool:

```bash
# Generate JSON summary
k6 run --summary-export=summary.json script.js

# Use k6-reporter (third-party)
npm install -g k6-html-reporter
k6-html-reporter -j summary.json -o report.html
```

### Trend Analysis

Compare results over time:

```javascript
// Store historical results and compare
const historicalBaseline = {
  p95_response_time: 678,  // Previous test p95
  error_rate: 0.001,       // Previous error rate
  throughput: 24,          // Previous RPS
};

// In CI, compare and alert on regression
// Example threshold for 10% regression
export const options = {
  thresholds: {
    http_req_duration: [`p(95)<${historicalBaseline.p95_response_time * 1.1}`],
  },
};
```

---

## Performance Budgets

### Defining Budgets

Performance budgets are limits that should not be exceeded:

| Metric | Budget | Rationale |
|--------|--------|-----------|
| **Homepage LCP** | < 2.5s | Core Web Vitals target |
| **API Response (p95)** | < 500ms | User-perceived responsiveness |
| **Error Rate** | < 0.1% | SLO requirement |
| **Bundle Size** | < 500KB (gzipped) | Initial load performance |
| **Time to Interactive** | < 3.5s | Engagement threshold |

### Budget Monitoring

```javascript
// tests/load/budget-check.js
export const options = {
  thresholds: {
    // Response time budgets
    'http_req_duration{page:homepage}': ['p(95)<2500'],
    'http_req_duration{page:portfolio}': ['p(95)<3000'],
    'http_req_duration{type:api}': ['p(95)<500'],

    // Error budget
    http_req_failed: ['rate<0.001'],  // 0.1% error budget

    // Throughput budget (minimum)
    http_reqs: ['rate>10'],  // At least 10 RPS
  },
};
```

### Budget Enforcement

#### In CI/CD

```yaml
# .github/workflows/budget-check.yml
- name: Run Performance Budget Check
  run: |
    k6 run tests/load/budget-check.js
    if [ $? -ne 0 ]; then
      echo "::warning::Performance budget exceeded"
      # Non-blocking, but creates GitHub annotation
    fi
```

#### Budget Tracking Dashboard

Track budget consumption over time:

```markdown
## Weekly Performance Budget Report

| Metric | Budget | Actual | Status |
|--------|--------|--------|--------|
| Homepage p95 | 2500ms | 1850ms | :white_check_mark: 74% |
| API p95 | 500ms | 320ms | :white_check_mark: 64% |
| Error Rate | 0.1% | 0.02% | :white_check_mark: 20% |
| Bundle Size | 500KB | 420KB | :white_check_mark: 84% |
```

---

## Scalability Recommendations

### Current Architecture Analysis

MeJohnC.Org's JAMstack architecture provides inherent scalability benefits:

| Component | Scalability | Bottleneck Risk |
|-----------|-------------|-----------------|
| **Netlify CDN** | Excellent (auto-scales) | Low |
| **Static Assets** | Excellent (cached at edge) | None |
| **Supabase API** | Good (managed, auto-scales) | Connection pool |
| **Edge Functions** | Good (auto-scales) | Cold starts |
| **Database** | Moderate (single region) | Query performance |

### Scaling Strategies

#### Short-term Optimizations

1. **Database Query Optimization**
   ```sql
   -- Add indexes for common queries
   CREATE INDEX idx_apps_status ON apps(status) WHERE status = 'published';
   CREATE INDEX idx_blog_posts_published ON blog_posts(status, published_at DESC);
   ```

2. **API Response Caching**
   ```typescript
   // Add cache headers for public data
   const headers = {
     'Cache-Control': 'public, max-age=300', // 5 minutes
   };
   ```

3. **Connection Pool Tuning**
   - Review Supabase connection pool settings
   - Implement connection pooling via Supabase's built-in pooler

#### Medium-term Improvements

1. **Implement Read Replicas**
   - Use Supabase read replicas for heavy read traffic
   - Route reporting queries to replicas

2. **Add Redis Caching Layer**
   ```
   Client → Edge Function → Redis Cache → Supabase
                              ↓ (cache miss)
                           Supabase
   ```

3. **Optimize Large Queries**
   - Paginate large result sets
   - Use cursors for infinite scroll
   - Implement query result caching

#### Long-term Scaling

1. **Multi-Region Deployment**
   - Deploy to multiple Netlify regions
   - Use Supabase's regional read replicas
   - Implement geo-routing

2. **Database Sharding** (if needed)
   - Shard by tenant/user if multi-tenant
   - Time-based partitioning for logs/events

3. **Event-Driven Architecture**
   - Move heavy operations to background jobs
   - Implement message queues for async processing

### Capacity Planning

Based on load test results, plan for growth:

```
Current Capacity:
- Comfortable: 50 concurrent users
- Peak: 100 concurrent users
- Breaking point: ~200 concurrent users

Growth Projections:
- 6 months: 2x traffic expected
- 12 months: 5x traffic expected

Action Items:
- [ ] Optimize database queries (immediate)
- [ ] Implement caching layer (3 months)
- [ ] Review Supabase plan (6 months)
```

### Load Test-Driven Scaling

Use load test results to inform scaling decisions:

| Current p95 | Target p95 | VUs at Target | Scaling Action |
|-------------|------------|---------------|----------------|
| 500ms | 500ms | 50 | None needed |
| 800ms | 500ms | 100 | Optimize queries |
| 1500ms | 500ms | 200 | Add caching |
| 3000ms | 500ms | 500 | Scale infrastructure |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | Claude Code | Initial version (Issue #65) |

---

## References

- [k6 Documentation](https://k6.io/docs/)
- [Grafana Cloud k6](https://grafana.com/docs/grafana-cloud/k6/)
- [Artillery Documentation](https://www.artillery.io/docs)
- [Locust Documentation](https://docs.locust.io/)
- [Web Performance Best Practices](https://web.dev/performance/)
- [Google Core Web Vitals](https://web.dev/vitals/)
- [Supabase Performance Guide](https://supabase.com/docs/guides/platform/performance)

---

*This document should be reviewed quarterly and updated as the application architecture evolves.*
