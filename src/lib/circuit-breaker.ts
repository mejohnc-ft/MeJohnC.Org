/**
 * Circuit Breaker Pattern for Graceful Degradation
 *
 * Prevents cascade failures by failing fast when a service is unhealthy.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service unhealthy, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 *
 * Usage:
 *   const breaker = new CircuitBreaker('supabase-api', {
 *     failureThreshold: 5,
 *     recoveryTimeout: 30000,
 *   });
 *
 *   const result = await breaker.execute(() => fetchFromSupabase());
 */

import { log } from "./logger";

/**
 * Circuit breaker states
 */
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Name for logging and metrics */
  name: string;
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Percentage of failures to trigger open (alternative to count) */
  failureRateThreshold?: number;
  /** Minimum calls before rate calculation applies (default: 10) */
  minimumCalls?: number;
  /** Time in ms before attempting recovery (default: 30000) */
  recoveryTimeout?: number;
  /** Number of successful calls to close circuit (default: 3) */
  successThreshold?: number;
  /** Time window for failure counting in ms (default: 60000) */
  windowSize?: number;
  /** Fallback function when circuit is open */
  fallback?: <T>() => T | Promise<T>;
  /** Callback when state changes */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/**
 * Call result for metrics
 */
interface CallResult {
  timestamp: number;
  success: boolean;
  duration: number;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  totalCalls: number;
  failureRate: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  lastStateChange: Date;
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;
  private lastStateChangeTime = Date.now();
  private halfOpenSuccesses = 0;
  private callHistory: CallResult[] = [];

  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig | string) {
    const baseConfig = typeof config === "string" ? { name: config } : config;

    this.config = {
      name: baseConfig.name,
      failureThreshold: baseConfig.failureThreshold ?? 5,
      failureRateThreshold: baseConfig.failureRateThreshold ?? 50,
      minimumCalls: baseConfig.minimumCalls ?? 10,
      recoveryTimeout: baseConfig.recoveryTimeout ?? 30000,
      successThreshold: baseConfig.successThreshold ?? 3,
      windowSize: baseConfig.windowSize ?? 60000,
      fallback:
        baseConfig.fallback ??
        (() => {
          throw new Error(`Circuit breaker '${baseConfig.name}' is open`);
        }),
      onStateChange: baseConfig.onStateChange ?? (() => {}),
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Clean old call history
    this.cleanHistory();

    // Check if we should attempt recovery
    if (this.state === "OPEN") {
      if (this.shouldAttemptRecovery()) {
        this.transitionTo("HALF_OPEN");
      } else {
        log.warn(
          `Circuit breaker '${this.config.name}' is open, using fallback`,
          {
            state: this.state,
            recoveryIn:
              this.config.recoveryTimeout - (Date.now() - this.lastFailureTime),
          },
        );
        return this.config.fallback() as T;
      }
    }

    const start = performance.now();

    try {
      const result = await fn();
      this.recordSuccess(performance.now() - start);
      return result;
    } catch (error) {
      this.recordFailure(performance.now() - start);
      throw error;
    }
  }

  /**
   * Execute with automatic fallback on circuit open
   */
  async executeWithFallback<T>(
    fn: () => Promise<T>,
    fallback: () => T | Promise<T>,
  ): Promise<T> {
    try {
      return await this.execute(fn);
    } catch (error) {
      if (this.state === "OPEN") {
        return fallback();
      }
      throw error;
    }
  }

  /**
   * Check if request should be allowed
   */
  isAllowed(): boolean {
    this.cleanHistory();

    if (this.state === "CLOSED") return true;
    if (this.state === "OPEN") return this.shouldAttemptRecovery();
    return true; // HALF_OPEN allows requests
  }

  /**
   * Record a successful call
   */
  private recordSuccess(duration: number): void {
    this.successes++;
    this.lastSuccessTime = Date.now();
    this.callHistory.push({ timestamp: Date.now(), success: true, duration });

    if (this.state === "HALF_OPEN") {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this.transitionTo("CLOSED");
      }
    } else if (this.state === "CLOSED") {
      // Reset failure count on success in closed state
      this.failures = 0;
    }
  }

  /**
   * Record a failed call
   */
  private recordFailure(duration: number): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.callHistory.push({ timestamp: Date.now(), success: false, duration });

    if (this.state === "HALF_OPEN") {
      // Any failure in half-open goes back to open
      this.transitionTo("OPEN");
    } else if (this.shouldOpen()) {
      this.transitionTo("OPEN");
    }
  }

  /**
   * Check if circuit should open
   */
  private shouldOpen(): boolean {
    // Check absolute failure threshold
    if (this.failures >= this.config.failureThreshold) {
      return true;
    }

    // Check failure rate threshold
    const recentCalls = this.getRecentCalls();
    if (recentCalls.length >= this.config.minimumCalls) {
      const failureRate = this.calculateFailureRate(recentCalls);
      if (failureRate >= this.config.failureRateThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if recovery should be attempted
   */
  private shouldAttemptRecovery(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    if (oldState === newState) return;

    this.state = newState;
    this.lastStateChangeTime = Date.now();

    if (newState === "HALF_OPEN") {
      this.halfOpenSuccesses = 0;
    }

    if (newState === "CLOSED") {
      this.failures = 0;
      this.halfOpenSuccesses = 0;
    }

    log.info(`Circuit breaker '${this.config.name}' state changed`, {
      from: oldState,
      to: newState,
    });

    this.config.onStateChange(oldState, newState);
  }

  /**
   * Get calls within the window
   */
  private getRecentCalls(): CallResult[] {
    const cutoff = Date.now() - this.config.windowSize;
    return this.callHistory.filter((c) => c.timestamp > cutoff);
  }

  /**
   * Calculate failure rate
   */
  private calculateFailureRate(calls: CallResult[]): number {
    if (calls.length === 0) return 0;
    const failures = calls.filter((c) => !c.success).length;
    return (failures / calls.length) * 100;
  }

  /**
   * Clean old call history
   */
  private cleanHistory(): void {
    const cutoff = Date.now() - this.config.windowSize * 2;
    this.callHistory = this.callHistory.filter((c) => c.timestamp > cutoff);
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    const recentCalls = this.getRecentCalls();

    return {
      name: this.config.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalCalls: this.successes + this.failures,
      failureRate: this.calculateFailureRate(recentCalls),
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
      lastSuccess: this.lastSuccessTime ? new Date(this.lastSuccessTime) : null,
      lastStateChange: new Date(this.lastStateChangeTime),
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Force circuit to open
   */
  forceOpen(): void {
    this.transitionTo("OPEN");
  }

  /**
   * Force circuit to close
   */
  forceClose(): void {
    this.transitionTo("CLOSED");
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = "CLOSED";
    this.failures = 0;
    this.successes = 0;
    this.halfOpenSuccesses = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = 0;
    this.lastStateChangeTime = Date.now();
    this.callHistory = [];
  }
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  get(
    name: string,
    config?: Omit<CircuitBreakerConfig, "name">,
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ name, ...config }));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  getAll(): CircuitBreaker[] {
    return Array.from(this.breakers.values());
  }

  /**
   * Get stats for all breakers
   */
  getAllStats(): CircuitBreakerStats[] {
    return this.getAll().map((b) => b.getStats());
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((b) => b.reset());
  }
}

// Export singleton registry
export const circuitBreakers = new CircuitBreakerRegistry();

// Pre-configured breakers for common services
export const supabaseBreaker = circuitBreakers.get("supabase", {
  failureThreshold: 5,
  recoveryTimeout: 30000,
});

export const externalApiBreaker = circuitBreakers.get("external-api", {
  failureThreshold: 10,
  recoveryTimeout: 15000,
});
