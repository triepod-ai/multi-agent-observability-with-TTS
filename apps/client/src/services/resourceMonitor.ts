/**
 * Resource Monitor Service
 * Real-time monitoring of memory, CPU, and execution time for secure code execution
 */

export interface ResourceUsage {
  memoryMB: number;
  cpuPercent: number;
  executionTimeMs: number;
  networkRequests: number;
  domModifications: number;
}

export interface ResourceAlert {
  type: 'memory' | 'cpu' | 'time' | 'network' | 'dom';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  value: number;
  limit: number;
  timestamp: number;
}

export interface MonitoringConfig {
  memoryLimitMB: number;
  cpuLimitPercent: number;
  timeLimitMs: number;
  networkRequestLimit: number;
  domModificationLimit: number;
  samplingIntervalMs: number;
}

export class ResourceMonitor {
  private isMonitoring = false;
  private startTime = 0;
  private peakMemoryMB = 0;
  private peakCpuPercent = 0;
  private networkRequestCount = 0;
  private domModificationCount = 0;
  private monitoringTimer: number | null = null;
  private alerts: ResourceAlert[] = [];
  private observers: MutationObserver[] = [];

  private readonly defaultConfig: MonitoringConfig = {
    memoryLimitMB: 32,
    cpuLimitPercent: 80,
    timeLimitMs: 10000,
    networkRequestLimit: 10,
    domModificationLimit: 100,
    samplingIntervalMs: 100
  };

  private config: MonitoringConfig;
  private callbacks: Array<(usage: ResourceUsage) => void> = [];

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = { ...this.defaultConfig, ...config };
    this.setupNetworkMonitoring();
    this.setupDOMMonitoring();
  }

  /**
   * Start monitoring resources
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }

    this.isMonitoring = true;
    this.startTime = performance.now();
    this.peakMemoryMB = 0;
    this.peakCpuPercent = 0;
    this.networkRequestCount = 0;
    this.domModificationCount = 0;
    this.alerts = [];

    // Start monitoring loop
    this.monitor();
  }

  /**
   * Stop monitoring resources
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringTimer) {
      clearTimeout(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    // Cleanup observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * Get current resource usage
   */
  getCurrentUsage(): ResourceUsage {
    const now = performance.now();
    
    return {
      memoryMB: this.getCurrentMemoryUsage(),
      cpuPercent: this.getCurrentCpuUsage(),
      executionTimeMs: this.isMonitoring ? Math.round(now - this.startTime) : 0,
      networkRequests: this.networkRequestCount,
      domModifications: this.domModificationCount
    };
  }

  /**
   * Get peak resource usage since monitoring started
   */
  getPeakUsage(): ResourceUsage {
    const current = this.getCurrentUsage();
    
    return {
      memoryMB: Math.max(this.peakMemoryMB, current.memoryMB),
      cpuPercent: Math.max(this.peakCpuPercent, current.cpuPercent),
      executionTimeMs: current.executionTimeMs,
      networkRequests: current.networkRequests,
      domModifications: current.domModifications
    };
  }

  /**
   * Get all alerts generated during monitoring
   */
  getAlerts(): ResourceAlert[] {
    return [...this.alerts];
  }

  /**
   * Subscribe to real-time usage updates
   */
  subscribe(callback: (usage: ResourceUsage) => void): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Main monitoring loop
   */
  private monitor(): void {
    if (!this.isMonitoring) return;

    try {
      const usage = this.getCurrentUsage();
      
      // Update peak values
      this.peakMemoryMB = Math.max(this.peakMemoryMB, usage.memoryMB);
      this.peakCpuPercent = Math.max(this.peakCpuPercent, usage.cpuPercent);
      
      // Check limits and generate alerts
      this.checkLimits(usage);
      
      // Notify subscribers
      this.callbacks.forEach(callback => {
        try {
          callback(usage);
        } catch (error) {
          console.warn('Resource monitor callback error:', error);
        }
      });

      // Schedule next monitoring cycle
      this.monitoringTimer = window.setTimeout(
        () => this.monitor(), 
        this.config.samplingIntervalMs
      );
      
    } catch (error) {
      console.error('Resource monitoring error:', error);
      this.isMonitoring = false;
    }
  }

  /**
   * Check resource limits and generate alerts
   */
  private checkLimits(usage: ResourceUsage): void {
    const now = Date.now();

    // Memory check
    if (usage.memoryMB > this.config.memoryLimitMB) {
      this.addAlert({
        type: 'memory',
        severity: usage.memoryMB > this.config.memoryLimitMB * 1.5 ? 'critical' : 'error',
        message: `Memory usage exceeded limit: ${usage.memoryMB.toFixed(2)}MB > ${this.config.memoryLimitMB}MB`,
        value: usage.memoryMB,
        limit: this.config.memoryLimitMB,
        timestamp: now
      });
    }

    // CPU check
    if (usage.cpuPercent > this.config.cpuLimitPercent) {
      this.addAlert({
        type: 'cpu',
        severity: usage.cpuPercent > this.config.cpuLimitPercent * 1.2 ? 'error' : 'warning',
        message: `CPU usage exceeded limit: ${usage.cpuPercent.toFixed(1)}% > ${this.config.cpuLimitPercent}%`,
        value: usage.cpuPercent,
        limit: this.config.cpuLimitPercent,
        timestamp: now
      });
    }

    // Time check
    if (usage.executionTimeMs > this.config.timeLimitMs) {
      this.addAlert({
        type: 'time',
        severity: 'critical',
        message: `Execution time exceeded limit: ${usage.executionTimeMs}ms > ${this.config.timeLimitMs}ms`,
        value: usage.executionTimeMs,
        limit: this.config.timeLimitMs,
        timestamp: now
      });
    }

    // Network check
    if (usage.networkRequests > this.config.networkRequestLimit) {
      this.addAlert({
        type: 'network',
        severity: 'warning',
        message: `Network requests exceeded limit: ${usage.networkRequests} > ${this.config.networkRequestLimit}`,
        value: usage.networkRequests,
        limit: this.config.networkRequestLimit,
        timestamp: now
      });
    }

    // DOM modifications check
    if (usage.domModifications > this.config.domModificationLimit) {
      this.addAlert({
        type: 'dom',
        severity: 'warning',
        message: `DOM modifications exceeded limit: ${usage.domModifications} > ${this.config.domModificationLimit}`,
        value: usage.domModifications,
        limit: this.config.domModificationLimit,
        timestamp: now
      });
    }
  }

  /**
   * Add alert to the collection
   */
  private addAlert(alert: ResourceAlert): void {
    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  /**
   * Get current memory usage (approximation)
   */
  private getCurrentMemoryUsage(): number {
    try {
      const memInfo = (performance as any).memory;
      if (memInfo && memInfo.usedJSHeapSize) {
        return memInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
      }
    } catch (error) {
      // Fallback estimation based on navigation timing
    }
    
    return 0; // Unable to measure
  }

  /**
   * Get current CPU usage (approximation)
   */
  private getCurrentCpuUsage(): number {
    try {
      // Approximate CPU usage based on timing
      const start = performance.now();
      
      // Perform a small computational task
      let sum = 0;
      for (let i = 0; i < 10000; i++) {
        sum += Math.random();
      }
      
      const duration = performance.now() - start;
      
      // Rough estimate: longer duration = higher CPU usage
      return Math.min(duration * 10, 100); // Cap at 100%
      
    } catch (error) {
      return 0; // Unable to measure
    }
  }

  /**
   * Setup network request monitoring
   */
  private setupNetworkMonitoring(): void {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      if (this.isMonitoring) {
        this.networkRequestCount++;
      }
      return originalFetch.apply(window, args);
    };

    // Monitor XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(...args) {
      if (this.isMonitoring) {
        this.networkRequestCount++;
      }
      return originalXHROpen.apply(this, args);
    }.bind(this);
  }

  /**
   * Setup DOM modification monitoring
   */
  private setupDOMMonitoring(): void {
    try {
      const observer = new MutationObserver((mutations) => {
        if (this.isMonitoring) {
          this.domModificationCount += mutations.length;
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true
      });

      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to setup DOM monitoring:', error);
    }
  }

  /**
   * Get monitoring status
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get monitoring configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Reset monitoring data
   */
  reset(): void {
    this.peakMemoryMB = 0;
    this.peakCpuPercent = 0;
    this.networkRequestCount = 0;
    this.domModificationCount = 0;
    this.alerts = [];
    this.startTime = performance.now();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
    this.callbacks = [];
    this.alerts = [];
  }
}

// Export singleton instance
export const resourceMonitor = new ResourceMonitor();