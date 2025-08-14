;(() => {
  const CONFIG = {
    // Configuración se obtiene del servidor
    apiBaseUrl: window.SMARTBEE_CONFIG?.apiBaseUrl ?? '/user',
    userId: window.SMARTBEE_CONFIG?.userId ?? 'default',
    
    // Configuración de la API
    api: {
      timeout: 10000, //Consultas a la API

      retryAttempts: 3,
      retryDelay: 1000
    },
    
    // Configuración de actualización en tiempo real
    realtime: {
      interval: 30000, // 30 segundos
      enabled: true
    }
  };

  // ---------- Estado reactivo usando Proxy ----------
  const createReactiveState = (initialState, onChange) => {
    return new Proxy(initialState, {
      set(target, property, value) {
        const oldValue = target[property];
        target[property] = value;
        if (onChange && oldValue !== value) {
          onChange(property, value, oldValue);
        }
        return true;
      }
    });
  };

  const state = createReactiveState({
    realTimeData: {
      time: "Cargando...",
      temperature: 0,
      humidity: 0,
      weight: 0,
      beeActivity: "Cargando...",
      hiveTemperature: 0,
      hiveHumidity: 0
    },
    // Agregar estructura de datos históricos
    historicalData: {
      day: {
        records: []
      },
      week: {
        dailyData: []
      },
      month: {
        dailyData: []
      },
      year: {
        monthlyData: []
      }
    },
    selectedPeriod: "day",
    selectedHive: "all",
    selectedSource: "exterior",
    startDate: "",
    endDate: "",
    showChart: true,
    selectedMonthIndex: null,
    selectedDayIndex: null,
    isLoading: false,
    error: null,
    hives: [],
    alerts: []
  }, (property, newValue) => {
    // Reaccionar a cambios de estado
    if (property === 'isLoading') {
      updateLoadingUI(newValue);
    }
    if (property === 'error' && newValue) {
      showError(newValue);
    }
  });

  // ---------- API Client moderno con fetch y manejo de errores ----------
  class APIClient {
    constructor(baseUrl, options = {}) {
      this.baseUrl = baseUrl;
      this.timeout = options.timeout || CONFIG.api.timeout;
      this.retryAttempts = options.retryAttempts || CONFIG.api.retryAttempts;
      this.retryDelay = options.retryDelay || CONFIG.api.retryDelay;
    }

    async request(endpoint, options = {}) {
      const url = `${this.baseUrl}${endpoint}`;
      const defaultOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      };

      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          
          const response = await fetch(url, {
            ...defaultOptions,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          return await response.json();
        } catch (error) {
          console.error(`API request attempt ${attempt} failed:`, error);
          
          if (attempt === this.retryAttempts) {
            throw new Error(`API request failed after ${this.retryAttempts} attempts: ${error.message}`);
          }
          
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Métodos específicos de la API
    async getRealTimeData(userId) {
      return this.request(`/realtime/${userId}`);
    }

    async getHistoricalData(userId, params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return this.request(`/historical/${userId}?${queryString}`);
    }

    async getAlerts(userId) {
      return this.request(`/alerts/${userId}`);
    }

    async getHives(userId) {
      return this.request(`/hives/${userId}`);
    }
  }

  // Instancia del cliente API
  const apiClient = new APIClient(CONFIG.apiBaseUrl);

  // ---------- Gestión de elementos DOM con cache ----------
  const ElementManager = {
    cache: new Map(),
    
    get(id) {
      if (!this.cache.has(id)) {
        this.cache.set(id, document.getElementById(id));
      }
      return this.cache.get(id);
    },
    
    getAll(selector) {
      return document.querySelectorAll(selector);
    },
    
    clear() {
      this.cache.clear();
    }
  };

  // ---------- Servicios de datos ----------
  const DataService = {
    async fetchRealTimeData() {
      try {
        state.isLoading = true;
        state.error = null;
        
        console.log('Solicitando datos en tiempo real para usuario:', CONFIG.userId);
        const data = await apiClient.getRealTimeData(CONFIG.userId);
        console.log('Datos recibidos del servidor:', data);
        
        state.realTimeData = {
          time: new Date(data.timestamp).toLocaleString(),
          temperature: parseFloat(data.temperature) || 0,
          humidity: parseFloat(data.humidity) || 0,
          weight: parseFloat(data.weight) || 0,
          beeActivity: data.beeActivity || "Sin datos",
          hiveTemperature: parseFloat(data.hiveTemperature) || 0,
          hiveHumidity: parseFloat(data.hiveHumidity) || 0
        };
        
        console.log('Estado actualizado:', state.realTimeData);
        return state.realTimeData;
      } catch (error) {
        console.error('Error fetching real-time data:', error);
        state.error = 'Error al cargar datos en tiempo real';
        throw error;
      } finally {
        state.isLoading = false;
      }
    },

    async fetchHistoricalData(period, hive = 'all', source = 'exterior', startDate = '', endDate = '') {
      try {
        state.isLoading = true;
        state.error = null;
        
        console.log('Solicitando datos históricos:', { period, hive, source, startDate, endDate });
        
        const params = {
          period,
          hive,
          source,
          ...(startDate && { startDate }),
          ...(endDate && { endDate })
        };
        
        const data = await apiClient.getHistoricalData(CONFIG.userId, params);
        console.log('Datos históricos recibidos:', data);
        
        // CORRECCIÓN CRÍTICA: Asignar correctamente los datos históricos
        if (data && typeof data === 'object') {
          // Asignar toda la estructura de datos recibida
          state.historicalData = data;
          console.log('Datos históricos asignados al estado:', state.historicalData);
        } else {
          console.error('Datos históricos inválidos recibidos:', data);
        }
        
        return data;
      } catch (error) {
        console.error('Error fetching historical data:', error);
        state.error = 'Error al cargar datos históricos';
        throw error;
      } finally {
        state.isLoading = false;
      }
    },

    async fetchAlerts() {
      try {
        const alerts = await apiClient.getAlerts(CONFIG.userId);
        state.alerts = alerts;
        return alerts;
      } catch (error) {
        console.error('Error fetching alerts:', error);
        state.error = 'Error al cargar alertas';
        throw error;
      }
    },

    async fetchHives() {
      try {
        const hives = await apiClient.getHives(CONFIG.userId);
        state.hives = hives;
        return hives;
      } catch (error) {
        console.error('Error fetching hives:', error);
        state.error = 'Error al cargar colmenas';
        throw error;
      }
    }
  };

  // ---------- Componentes de UI ----------
  const UIComponents = {
    renderRealtime() {
      console.log('Renderizando datos en tiempo real:', state.realTimeData);
      
      const elements = {
        weight: ElementManager.get("rt-weight"),
        activity: ElementManager.get("rt-activity"),
        temperature: ElementManager.get("rt-temperature"),
        humidity: ElementManager.get("rt-humidity"),
        hiveTemperature: ElementManager.get("rt-hive-temperature"),
        hiveHumidity: ElementManager.get("rt-hive-humidity")
      };
      
      // Verificar que los elementos existen
      Object.entries(elements).forEach(([key, element]) => {
        if (!element) {
          console.error(`Elemento no encontrado: rt-${key}`);
          return;
        }
        
        let value;
        let suffix = this.getSuffix(key);
        
        if (key === 'activity') {
          value = state.realTimeData.beeActivity;
        } else {
          value = state.realTimeData[key];
        }
        
        const displayValue = state.isLoading ? "Cargando..." : `${value}${suffix}`;
        
        console.log(`Actualizando ${key}: ${displayValue}`);
        element.textContent = displayValue;
        
        // Añadir animación visual para confirmar actualización
        element.style.transition = 'all 0.3s ease';
        element.style.backgroundColor = '#e3f2fd';
        setTimeout(() => {
          element.style.backgroundColor = '';
        }, 500);
      });
    },

    getSuffix(key) {
      const suffixes = {
        weight: ' kg',
        temperature: '°C',
        humidity: '%',
        hiveTemperature: '°C',
        hiveHumidity: '%',
        activity: ''
      };
      return suffixes[key] || '';
    },

    async renderAlerts() {
      const list = ElementManager.get("alerts-list");
      const empty = ElementManager.get("alerts-empty");
      if (!list || !empty) return;
      
      try {
        const alerts = await DataService.fetchAlerts();
        
        if (!alerts.length) {
          list.innerHTML = "";
          empty.classList.remove("hidden");
          return;
        }
        
        empty.classList.add("hidden");
        list.innerHTML = alerts
          .map((alert) => this.createAlertHTML(alert))
          .join("");
        
        this.refreshIcons();
      } catch (error) {
        showError('Error al cargar alertas');
      }
    },

    createAlertHTML(alert) {
      const isCritical = alert.type === "critical";
      const icon = isCritical ? "alert-triangle" : "info";
      const iconColor = isCritical ? "text-red-600" : "text-yellow-600";
      const cls = isCritical ? "alert alert--critical" : "alert alert--warning";
      
      return `
        <li class="${cls}">
          <div style="display:flex;align-items:flex-start;">
            <i data-lucide="${icon}" class="icon icon--sm ${iconColor}" style="margin-right:12px;margin-top:2px;"></i>
            <div>
              <p style="font-weight:700;margin:0 0 2px;">${this.escapeHtml(alert.title)}</p>
              <p style="margin:0 0 4px;font-size:14px;">${this.escapeHtml(alert.message)}</p>
              <p style="margin:0;font-size:12px;color:#6b7280;">${new Date(alert.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </li>
      `;
    },

    escapeHtml(str) {
      return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    },

    refreshIcons() {
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    }
  };

  // ---------- Gestión de tiempo real ----------
  const RealtimeManager = {
    interval: null,
    
    async start() {
      if (!CONFIG.realtime.enabled) return;
      
      try {
        await DataService.fetchRealTimeData();
        UIComponents.renderRealtime();
        
        this.interval = setInterval(async () => {
          try {
            await DataService.fetchRealTimeData();
            UIComponents.renderRealtime();
          } catch (error) {
            console.error('Error updating real-time data:', error);
          }
        }, CONFIG.realtime.interval);
      } catch (error) {
        showError('Error al inicializar datos en tiempo real');
      }
    },
    
    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    }
  };

  // ---------- Funciones de utilidad ----------
  function updateLoadingUI(isLoading) {
    const loadingElements = ElementManager.getAll('.loading-indicator');
    loadingElements.forEach(el => {
      el.style.display = isLoading ? 'block' : 'none';
    });
  }

  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert--critical';
    errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 300px;';
    errorDiv.innerHTML = `
      <div style="display:flex;align-items:flex-start;">
        <i data-lucide="alert-triangle" class="icon icon--sm text-red-600" style="margin-right:12px;margin-top:2px;"></i>
        <div>
          <p style="font-weight:700;margin:0 0 2px;">Error</p>
          <p style="margin:0;font-size:14px;">${UIComponents.escapeHtml(message)}</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(errorDiv);
    UIComponents.refreshIcons();
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }


  // ---------- Inicialización ----------
  async function init() {
    try {
      console.log('Iniciando dashboard...');
      
      // 1. Cargar configuración del servidor PRIMERO
      await loadServerConfig();
      
      // 2. Verificar elementos DOM críticos
      const criticalElements = [
        'rt-weight', 'rt-activity', 'rt-temperature', 
        'rt-humidity', 'rt-hive-temperature', 'rt-hive-humidity'
      ];
      
      const missingElements = criticalElements.filter(id => !document.getElementById(id));
      if (missingElements.length > 0) {
        console.error('Elementos DOM faltantes:', missingElements);
        showError(`Elementos faltantes en la página: ${missingElements.join(', ')}`);
      }
      
      // 4. Inicializar servicios
      try {
        await DataService.fetchHives();
        console.log('Colmenas cargadas');
      } catch (error) {
        console.error('Error cargando colmenas:', error);
      }
      
      try {
        await UIComponents.renderAlerts();
        console.log('Alertas renderizadas');
      } catch (error) {
        console.error('Error renderizando alertas:', error);
      }
      
      // 5. Cargar datos históricos iniciales
      try {
        console.log('Cargando datos históricos iniciales...');
        const initialData = await DataService.fetchHistoricalData(
          state.selectedPeriod,
          state.selectedHive,
          state.selectedSource,
          state.startDate,
          state.endDate
        );
        
        if (initialData) {
          console.log('Datos históricos iniciales cargados correctamente');
        }
      } catch (error) {
        console.error('Error cargando datos históricos iniciales:', error);
      }
      
      // 6. Iniciar tiempo real
      try {
        console.log('Iniciando servicio de tiempo real...');
        await RealtimeManager.start();
        console.log('Servicio de tiempo real iniciado');
      } catch (error) {
        console.error('Error iniciando tiempo real:', error);
        showError('Error al inicializar datos en tiempo real');
      }
      
      console.log('Dashboard inicializado correctamente');
    } catch (error) {
      console.error('Error durante la inicialización:', error);
      showError('Error al inicializar el dashboard');
    }
  }

  // Modificar la inicialización para usar async/await
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---------- Exportar al objeto global ----------
  window.SmartBeeBackend = {
    DataController: {
      getState: () => state,
      updateState: (updates) => {
        Object.assign(state, updates);
        // Cargar datos históricos cuando cambie el período
        if (updates.selectedPeriod) {
          return DataService.fetchHistoricalData(
            updates.selectedPeriod,
            state.selectedHive,
            state.selectedSource,
            state.startDate,
            state.endDate
          ).then(data => {
            if (data) {
              // ✅ CORRECTO: Asignar toda la estructura de datos
              state.historicalData = data;
            }
            return Promise.resolve();
          }).catch(console.error);
        }
      },
      getHistoricalData: () => state.historicalData,
      getChartData: () => {
        // Implementar lógica para datos del gráfico
        const historicalData = state.historicalData;
        const currentPeriod = state.selectedPeriod;
        
        let records = [];
        
        // Extraer registros según el período actual
        if (currentPeriod === 'day') {
          records = historicalData.day?.records || [];
        } else if (currentPeriod === 'week' && state.selectedDayIndex !== null) {
          records = historicalData.week?.dailyData?.[state.selectedDayIndex]?.records || [];
        } else if (currentPeriod === 'month' && state.selectedDayIndex !== null) {
          records = historicalData.month?.dailyData?.[state.selectedDayIndex]?.records || [];
        } else if (currentPeriod === 'year' && state.selectedMonthIndex !== null && state.selectedDayIndex !== null) {
          records = historicalData.year?.monthlyData?.[state.selectedMonthIndex]?.dailyData?.[state.selectedDayIndex]?.records || [];
        }
        
        return {
          labels: records.map(r => r.time || r.timestamp),
          temperature: records.map(r => parseFloat(r.temperature) || 0),
          humidity: records.map(r => parseFloat(r.humidity) || 0),
          weight: records.map(r => parseFloat(r.weight) || 0),
          title: `Datos ${currentPeriod === 'day' ? 'del Día' : currentPeriod === 'week' ? 'de la Semana' : currentPeriod === 'month' ? 'del Mes' : 'del Año'}`
        };
      },
      getCurrentHistoricalTitle: () => {
        const period = state.selectedPeriod;
        return period.charAt(0).toUpperCase() + period.slice(1);
      }
    },
    RealTimeService: RealtimeManager,
    AlertsManager: {
      getAlerts: () => state.alerts || []
    }
  };

  // ---------- Limpieza ----------
  window.addEventListener("beforeunload", () => {
    RealtimeManager.stop();
    ElementManager.clear();
  });

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

async function loadServerConfig() {
  try {
    console.log('Cargando configuración del servidor...');
    
    // Intentar cargar configuración desde el servidor
    const response = await fetch('/config');
    if (response.ok) {
      const serverConfig = await response.json();
      Object.assign(CONFIG, serverConfig);
      console.log('Configuración cargada desde servidor:', CONFIG);
    } else {
      console.log('Usando configuración por defecto');
    }
  } catch (error) {
    console.log('Error cargando configuración del servidor, usando valores por defecto:', error);
    // Usar configuración por defecto
  }
};