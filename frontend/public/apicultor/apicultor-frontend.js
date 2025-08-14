/**
 * SMARTBEE FRONTEND - Interfaz de Usuario y Animaciones
 * Responsable de: DOM, eventos, renderizado, gráficos y animaciones
 */
;(() => {
  'use strict';

  // Verificar que el backend esté disponible
  if (!window.SmartBeeBackend) {
    console.error('SmartBee Backend no está disponible. Verificando carga de scripts...');
    
    // Intentar cargar el script si no está disponible
    const script = document.createElement('script');
    script.src = './apicultor-dashboard-api.js';
    script.onload = () => {
      console.log('Backend cargado exitosamente');
      // Reintentar inicialización
      if (window.SmartBeeBackend) {
        App.init();
      }
    };
    script.onerror = () => {
      console.error('Error cargando el script del backend');
    };
    document.head.appendChild(script);
    return;
  }

  const { DataController, RealTimeService, AlertsManager } = window.SmartBeeBackend;

  // ---------- REFERENCIAS DOM ----------
  const DOMElements = {
    // Datos en tiempo real
    weight: () => document.getElementById("rt-weight"),
    activity: () => document.getElementById("rt-activity"),
    temperature: () => document.getElementById("rt-temperature"),
    humidity: () => document.getElementById("rt-humidity"),
    hiveTemperature: () => document.getElementById("rt-hive-temperature"),
    hiveHumidity: () => document.getElementById("rt-hive-humidity"),
    
    // Alertas
    alertsList: () => document.getElementById("alerts-list"),
    alertsEmpty: () => document.getElementById("alerts-empty"),
    
    // Controles
    logoutBtn: () => document.getElementById("logout-btn"),
    periodButtons: () => document.getElementById("period-buttons"),
    startDate: () => document.getElementById("start-date"),
    endDate: () => document.getElementById("end-date"),
    applyFilters: () => document.getElementById("apply-filters"),
    sourceSelect: () => document.getElementById("source-select"),
    
    // Vista histórica
    backButtons: () => document.getElementById("back-buttons"),
    historicalTitle: () => document.getElementById("historical-title"),
    historicalContent: () => document.getElementById("historical-content"),
  };

  // ---------- UTILIDADES UI ----------
  const UIUtils = {
    /**
     * Escapa HTML para prevenir XSS
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Refresca los iconos de Lucide
     */
    refreshIcons() {
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    },

    /**
     * Añade clase con animación
     * @param {HTMLElement} element - Elemento DOM
     * @param {string} className - Clase CSS
     */
    addClassWithAnimation(element, className) {
      if (!element) return;
      element.classList.add(className);
      element.style.transition = 'all 0.3s ease';
    },

    /**
     * Remueve clase con animación
     * @param {HTMLElement} element - Elemento DOM
     * @param {string} className - Clase CSS
     */
    removeClassWithAnimation(element, className) {
      if (!element) return;
      element.style.transition = 'all 0.3s ease';
      element.classList.remove(className);
    }
  };

  // ---------- RENDERIZADORES ----------
  const Renderers = {
    /**
     * Renderiza datos en tiempo real
     * @param {Object} data - Datos en tiempo real
     */
    renderRealtime(data) {
      console.log('Frontend: Renderizando datos en tiempo real:', data);
      
      const elements = {
        weight: DOMElements.weight(),
        activity: DOMElements.activity(),
        temperature: DOMElements.temperature(),
        humidity: DOMElements.humidity(),
        hiveTemperature: DOMElements.hiveTemperature(),
        hiveHumidity: DOMElements.hiveHumidity()
      };

      // Verificar elementos y actualizar
      Object.entries(elements).forEach(([key, element]) => {
        if (!element) {
          console.error(`Frontend: Elemento ${key} no encontrado`);
          return;
        }
        
        let value;
        switch(key) {
          case 'weight':
            value = `${data.weight} kg`;
            break;
          case 'activity':
            value = data.beeActivity;
            break;
          case 'temperature':
            value = `${data.temperature}°C`;
            break;
          case 'humidity':
            value = `${data.humidity}%`;
            break;
          case 'hiveTemperature':
            value = `${data.hiveTemperature}°C`;
            break;
          case 'hiveHumidity':
            value = `${data.hiveHumidity}%`;
            break;
          default:
            value = data[key] || '--';
        }
        
        console.log(`Frontend: Actualizando ${key} con valor: ${value}`);
        this.updateElementWithAnimation(element, value);
      });
    },

    /**
     * Actualiza elemento con animación de fade
     * @param {HTMLElement} element - Elemento a actualizar
     * @param {string} newText - Nuevo texto
     */
    updateElementWithAnimation(element, newText) {
      if (!element || element.textContent === newText) return;
      
      element.style.transition = 'opacity 0.3s ease';
      element.style.opacity = '0.5';
      
      setTimeout(() => {
        element.textContent = newText;
        element.style.opacity = '1';
      }, 150);
    },

    /**
     * Renderiza alertas
     */
    renderAlerts() {
      const list = DOMElements.alertsList();
      const empty = DOMElements.alertsEmpty();
      if (!list || !empty) return;

      const alerts = AlertsManager.getAlerts();
      
      if (!alerts.length) {
        list.innerHTML = "";
        UIUtils.removeClassWithAnimation(empty, "hidden");
        return;
      }
      
      UIUtils.addClassWithAnimation(empty, "hidden");
      
      list.innerHTML = alerts
        .map((alert) => {
          const isCritical = alert.type === "critical";
          const icon = isCritical ? "alert-triangle" : "info";
          const iconColor = isCritical ? "text-red-600" : "text-yellow-600";
          const cls = isCritical ? "alert alert--critical" : "alert alert--warning";
          return `
          <li class="${cls}" style="animation: slideInFromRight 0.3s ease;">
            <div style="display:flex;align-items:flex-start;">
              <i data-lucide="${icon}" class="icon icon--sm ${iconColor}" style="margin-right:12px;margin-top:2px;"></i>
              <div>
                <p style="font-weight:700;margin:0 0 2px;">${UIUtils.escapeHtml(alert.title)}</p>
                <p style="margin:0 0 4px;font-size:14px;">${UIUtils.escapeHtml(alert.message)}</p>
                <p style="margin:0;font-size:12px;color:#6b7280;">${new Date(alert.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </li>
        `;
        })
        .join("");
      
      UIUtils.refreshIcons();
    },

    /**
     * Renderiza botones de período
     */
    renderPeriodButtons() {
      const container = DOMElements.periodButtons();
      if (!container) return;
      
      const state = DataController.getState();
      
      container.querySelectorAll("button[data-period]").forEach((btn) => {
        const period = btn.getAttribute("data-period");
        const active = period === state.selectedPeriod;
        
        btn.classList.toggle("active", active);
        btn.className = `btn btn-toggle${active ? " active" : ""}`;
        
        // Añadir animación de hover
        if (!btn.hasAttribute('data-hover-setup')) {
          btn.addEventListener('mouseenter', () => {
            if (!btn.classList.contains('active')) {
              btn.style.transform = 'translateY(-2px)';
              btn.style.transition = 'transform 0.2s ease';
            }
          });
          btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
          });
          btn.setAttribute('data-hover-setup', 'true');
        }
      });
    },

    /**
     * Renderiza botones de navegación hacia atrás
     */
    renderBackButtons() {
      const container = DOMElements.backButtons();
      if (!container) return;
      
      const state = DataController.getState();
      let html = "";
      
      // Botones para vista anual
      if (state.selectedPeriod === "year" && (state.selectedMonthIndex !== null || state.selectedDayIndex !== null)) {
        if (state.selectedDayIndex !== null) {
          html += `<button id="btn-back-to-month" class="btn btn-toggle" type="button" style="animation: slideInFromLeft 0.3s ease;">&larr; Volver a la Vista Mensual</button>`;
        }
        if (state.selectedMonthIndex !== null && state.selectedDayIndex === null) {
          html += `<button id="btn-back-to-year" class="btn btn-toggle" type="button" style="animation: slideInFromLeft 0.3s ease;">&larr; Volver a la Vista Anual</button>`;
        }
      }
      // Botones para vista mensual
      else if (state.selectedPeriod === "month" && state.selectedDayIndex !== null) {
        html += `<button id="btn-back-to-month-list" class="btn btn-toggle" type="button" style="animation: slideInFromLeft 0.3s ease;">&larr; Volver a la Vista Mensual</button>`;
      }
      // Botones para vista semanal
      else if (state.selectedPeriod === "week" && state.selectedDayIndex !== null) {
        html += `<button id="btn-back-to-week-list" class="btn btn-toggle" type="button" style="animation: slideInFromLeft 0.3s ease;">&larr; Volver a la Vista Semanal</button>`;
      }
      
      if (html) {
        container.innerHTML = html;
        UIUtils.removeClassWithAnimation(container, "hidden");
        
        // Configurar eventos
        const bMonth = document.getElementById("btn-back-to-month");
        const bYear = document.getElementById("btn-back-to-year");
        const bMonthList = document.getElementById("btn-back-to-month-list");
        const bWeekList = document.getElementById("btn-back-to-week-list");
        
        if (bMonth) {
          bMonth.addEventListener("click", () => {
            DataController.updateState({ selectedDayIndex: null });
            this.renderHistorical();
          });
        }
        if (bYear) {
          bYear.addEventListener("click", () => {
            DataController.updateState({ 
              selectedMonthIndex: null, 
              selectedDayIndex: null 
            });
            this.renderHistorical();
          });
        }
        if (bMonthList) {
          bMonthList.addEventListener("click", () => {
            DataController.updateState({ selectedDayIndex: null });
            this.renderHistorical();
          });
        }
        if (bWeekList) {
          bWeekList.addEventListener("click", () => {
            DataController.updateState({ selectedDayIndex: null });
            this.renderHistorical();
          });
        }
      } else {
        UIUtils.addClassWithAnimation(container, "hidden");
        container.innerHTML = "";
      }
    },

    /**
     * Renderiza contenido histórico
     */
    renderHistorical() {
      const titleEl = DOMElements.historicalTitle();
      const state = DataController.getState();
      
      if (titleEl) {
        const sourceLabel = state.selectedSource === "exterior" ? "Exterior" : "Colmena";
        titleEl.textContent = `${DataController.getCurrentHistoricalTitle()} • ${sourceLabel}`;
      }
      
      this.renderBackButtons();
      
      const content = DOMElements.historicalContent();
      if (!content) return;
      
      const historicalData = DataController.getHistoricalData();
      
      // Renderizar según el período y estado actual
      this.renderHistoricalContent(content, historicalData, state);
    },

    /**
     * Renderiza el contenido específico según el período
     * @param {HTMLElement} content - Contenedor de contenido
     * @param {Object} historicalData - Datos históricos
     * @param {Object} state - Estado actual
     */
    renderHistoricalContent(content, historicalData, state) {
      // Vista anual (meses)
      if (state.selectedPeriod === "year" && state.selectedMonthIndex === null) {
        this.renderMonthsList(content, historicalData.year.monthlyData, state);
      }
      // Vista anual -> mensual (días)
      else if (state.selectedPeriod === "year" && state.selectedMonthIndex !== null && state.selectedDayIndex === null) {
        const days = historicalData.year.monthlyData[state.selectedMonthIndex]?.dailyData || [];
        this.renderDaysList(content, days, state, 'year');
      }
      // Vistas detalladas (registros por hora)
      else if (this.isDetailedView(state)) {
        this.renderDetailedView(content, historicalData, state);
      }
      // Vistas de lista (semana, mes)
      else {
        this.renderPeriodList(content, historicalData, state);
      }
      
      UIUtils.refreshIcons();
    },

    /**
     * Verifica si estamos en vista detallada
     * @param {Object} state - Estado actual
     * @returns {boolean} True si es vista detallada
     */
    isDetailedView(state) {
      return state.selectedPeriod === "day" || 
             (state.selectedPeriod === "week" && state.selectedDayIndex !== null) ||
             (state.selectedPeriod === "month" && state.selectedDayIndex !== null) ||
             (state.selectedPeriod === "year" && state.selectedMonthIndex !== null && state.selectedDayIndex !== null);
    },

    /**
     * Renderiza vista detallada con gráfico/lista
     * @param {HTMLElement} content - Contenedor
     * @param {Object} historicalData - Datos históricos
     * @param {Object} state - Estado actual
     */
    renderDetailedView(content, historicalData, state) {
      let data = [];
      
      if (state.selectedPeriod === "day") {
        data = historicalData.day.records;
      } else if (state.selectedPeriod === "week" && state.selectedDayIndex !== null) {
        data = historicalData.week.dailyData[state.selectedDayIndex]?.records || [];
      } else if (state.selectedPeriod === "month" && state.selectedDayIndex !== null) {
        data = historicalData.month.dailyData[state.selectedDayIndex]?.records || [];
      } else if (state.selectedPeriod === "year" && state.selectedMonthIndex !== null && state.selectedDayIndex !== null) {
        data = historicalData.year.monthlyData[state.selectedMonthIndex]?.dailyData[state.selectedDayIndex]?.records || [];
      }
      
      content.innerHTML = `
        <div style="animation: fadeIn 0.5s ease;">
          <div class="toggle" style="justify-content:flex-end;display:flex;margin-bottom:12px;">
            <label for="chart-toggle" class="muted">Mostrar Gráfico</label>
            <button id="chart-toggle" role="switch" aria-checked="${state.showChart ? "true" : "false"}" class="switch" type="button">
              <span class="switch__dot"></span>
            </button>
          </div>
          <div id="chart-container" class="chart-container" style="${state.showChart ? "" : "display:none;"}">
            <canvas id="historical-chart"></canvas>
          </div>
          <div id="data-list" style="${state.showChart ? "display:none;" : ""}">
            <div class="list-grid">
              ${this.renderDataList(data, state)}
            </div>
          </div>
        </div>
      `;
      
      this.setupChartToggle();
      if (state.showChart) {
        const canvas = document.getElementById("historical-chart");
        if (canvas) ChartManager.renderChart(canvas);
      }
    },

    /**
     * Renderiza lista de meses
     * @param {HTMLElement} content - Contenedor
     * @param {Array} months - Datos de meses
     * @param {Object} state - Estado actual
     */
    renderMonthsList(content, months, state) {
      content.innerHTML = `
        <div class="list-grid" style="animation: fadeIn 0.5s ease;">
          ${months.map((m, index) => `
            <div class="list-item" style="animation: slideInFromBottom 0.3s ease ${index * 0.1}s both;">
              <p class="item-title">${UIUtils.escapeHtml(m.label)}</p>
              <p>Temp Media: <strong>${m.averageTemperature}°C</strong></p>
              <p>Hum Media: <strong>${m.averageHumidity}%</strong></p>
              ${state.selectedSource === "colmena" ? `<p>Peso Medio: <strong>${m.averageWeight} kg</strong></p>` : ``}
              <button class="btn btn-primary" data-action="view-days" data-index="${index}" type="button" style="margin-top:8px;">Ver Días</button>
            </div>
          `).join("")}
        </div>
      `;
      
      // Configurar eventos
      content.querySelectorAll('[data-action="view-days"]').forEach((btn) => {
        btn.addEventListener("click", () => {
          const index = Number(btn.getAttribute("data-index"));
          DataController.updateState({ 
            selectedMonthIndex: index, 
            selectedDayIndex: null 
          });
          this.renderHistorical();
        });
      });
    },

    /**
     * Renderiza lista de días
     * @param {HTMLElement} content - Contenedor
     * @param {Array} days - Datos de días
     * @param {Object} state - Estado actual
     * @param {string} context - Contexto ('year', 'month', 'week')
     */
    renderDaysList(content, days, state, context = 'month') {
      content.innerHTML = `
        <div class="list-grid" style="animation: fadeIn 0.5s ease;">
          ${days.map((day, index) => `
            <div class="list-item" style="animation: slideInFromBottom 0.3s ease ${index * 0.05}s both;">
              <p class="item-title">${UIUtils.escapeHtml(day.label)}</p>
              <p>Temp Media: <strong>${day.averageTemperature}°C</strong></p>
              <p>Hum Media: <strong>${day.averageHumidity}%</strong></p>
              ${state.selectedSource === "colmena" ? `<p>Peso Medio: <strong>${day.averageWeight} kg</strong></p>` : ``}
              <button class="btn btn-primary" data-action="view-records" data-index="${index}" type="button" style="margin-top:8px;">Ver Registros</button>
            </div>
          `).join("")}
        </div>
      `;
      
      // Configurar eventos
      content.querySelectorAll('[data-action="view-records"]').forEach((btn) => {
        btn.addEventListener("click", () => {
          const index = Number(btn.getAttribute("data-index"));
          DataController.updateState({ selectedDayIndex: index });
          this.renderHistorical();
        });
      });
    },

    /**
     * Renderiza lista de períodos (semana, mes)
     * @param {HTMLElement} content - Contenedor
     * @param {Object} historicalData - Datos históricos
     * @param {Object} state - Estado actual
     */
    renderPeriodList(content, historicalData, state) {
      let data = [];
      
      if (state.selectedPeriod === "week") {
        data = historicalData.week.dailyData;
      } else if (state.selectedPeriod === "month") {
        data = historicalData.month.dailyData;
      }
      
      this.renderDaysList(content, data, state, state.selectedPeriod);
    },

    /**
     * Renderiza lista de datos individuales
     * @param {Array} records - Registros de datos
     * @param {Object} state - Estado actual
     * @returns {string} HTML de la lista
     */
    renderDataList(records, state) {
      if (!records || records.length === 0) {
        return '<div class="list-item"><p class="muted center">No hay datos disponibles para este período</p></div>';
      }
      
      return records.map((record, index) => `
        <div class="list-item" style="animation: slideInFromBottom 0.2s ease ${index * 0.02}s both;">
          <p class="item-title">${UIUtils.escapeHtml(record.time || record.timestamp)}</p>
          <p>Temperatura: <strong>${record.temperature !== null ? record.temperature + '°C' : 'Sin datos'}</strong></p>
          <p>Humedad: <strong>${record.humidity !== null ? record.humidity + '%' : 'Sin datos'}</strong></p>
          ${state.selectedSource === "colmena" ? `<p>Peso: <strong>${record.weight !== null ? record.weight + ' kg' : 'Sin datos'}</strong></p>` : ""}
          <p>Actividad: <strong>${record.beeActivity}</strong></p>
        </div>
      `).join("");
    },

    /**
     * Configura el toggle del gráfico
     */
    setupChartToggle() {
      const toggle = document.getElementById("chart-toggle");
      const chartContainer = document.getElementById("chart-container");
      const dataList = document.getElementById("data-list");
      
      if (!toggle || !chartContainer || !dataList) return;
      
      toggle.addEventListener("click", () => {
        const state = DataController.getState();
        const newShowChart = !state.showChart;
        
        DataController.updateState({ showChart: newShowChart });
        
        // Animación de transición
        if (newShowChart) {
          dataList.style.opacity = '0';
          setTimeout(() => {
            dataList.style.display = 'none';
            chartContainer.style.display = 'block';
            chartContainer.style.opacity = '0';
            setTimeout(() => {
              chartContainer.style.opacity = '1';
              const canvas = document.getElementById("historical-chart");
              if (canvas) ChartManager.renderChart(canvas);
            }, 50);
          }, 300);
        } else {
          chartContainer.style.opacity = '0';
          setTimeout(() => {
            chartContainer.style.display = 'none';
            dataList.style.display = 'block';
            dataList.style.opacity = '0';
            setTimeout(() => {
              dataList.style.opacity = '1';
            }, 50);
          }, 300);
        }
        
        toggle.setAttribute("aria-checked", newShowChart.toString());
      });
    }
  };

  // ---------- MANEJO DE GRÁFICOS ----------
  const ChartManager = {
    chartInstance: null,

    /**
     * Destruye el gráfico actual
     */
    destroyChart() {
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }
    },

    /**
     * Renderiza un gráfico en el canvas especificado
     * @param {HTMLCanvasElement} canvasEl - Elemento canvas
     */
    renderChart(canvasEl) {
      this.destroyChart();
      if (!canvasEl || !window.Chart) return;
      
      const ctx = canvasEl.getContext("2d");
      const chartData = DataController.getChartData();
      const state = DataController.getState();
      
      const datasets = [
        {
          label: "Temperatura (°C)",
          data: chartData.temperature,
          borderColor: "rgb(249,115,22)",
          backgroundColor: "rgba(249,115,22,0.1)",
          tension: 0.4,
          yAxisID: "y",
        },
        {
          label: "Humedad (%)",
          data: chartData.humidity,
          borderColor: "rgb(59,130,246)",
          backgroundColor: "rgba(59,130,246,0.1)",
          tension: 0.4,
          yAxisID: "y1",
        },
      ];
      
      if (state.selectedSource === "colmena") {
        datasets.push({
          label: "Peso (kg)",
          data: chartData.weight,
          borderColor: "rgb(34,197,94)",
          backgroundColor: "rgba(34,197,94,0.1)",
          tension: 0.4,
          yAxisID: "y2",
        });
      }
      
      this.chartInstance = new window.Chart(ctx, {
        type: "line",
        data: {
          labels: chartData.labels,
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false, // Esto permite que el gráfico use toda la altura disponible
          interaction: { mode: "index", intersect: false },
          animation: {
            duration: 1000,
            easing: 'easeInOutQuart'
          },
          plugins: {
            title: { 
              display: true, 
              text: chartData.title,
              font: {
                size: 16 // Aumentar el tamaño del título
              }
            },
            legend: { 
              position: "top",
              labels: {
                font: {
                  size: 14 // Aumentar el tamaño de las etiquetas
                }
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  let label = ctx.dataset.label || "";
                  if (label) label += ": ";
                  label += ctx.parsed.y;
                  if (ctx.dataset.label === "Temperatura (°C)") label += "°C";
                  else if (ctx.dataset.label === "Humedad (%)") label += "%";
                  else if (ctx.dataset.label === "Peso (kg)") label += " kg";
                  return label;
                },
              },
            },
          },
          scales: {
            x: { display: true, title: { display: true, text: "Tiempo" } },
            y: {
              type: "linear",
              display: true,
              position: "left",
              title: { display: true, text: "Temperatura (°C)" },
              grid: { drawOnChartArea: false },
            },
            y1: {
              type: "linear",
              display: true,
              position: "right",
              title: { display: true, text: "Humedad (%)" },
              grid: { drawOnChartArea: false },
            },
            y2: { type: "linear", display: false, position: "right" },
          },
        },
      });
    }
  };

  // ---------- CONTROLADORES DE EVENTOS ----------
  const EventHandlers = {
    /**
     * Configura botones de período
     */
    setupPeriodButtons() {
      const container = DOMElements.periodButtons();
      if (!container) return;
      
      container.querySelectorAll("button[data-period]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const period = btn.getAttribute("data-period");
          if (!period) return;
          
          // Mostrar indicador de carga
          const historicalContent = DOMElements.historicalContent();
          if (historicalContent) {
            historicalContent.innerHTML = '<div class="loading-spinner">Cargando datos...</div>';
          }
          
          try {
            // Esperar a que se actualice el estado y se carguen los datos
            await DataController.updateState({
              selectedPeriod: period,
              selectedMonthIndex: null,
              selectedDayIndex: null
            });
            
            // Ahora renderizar con los datos cargados
            Renderers.renderPeriodButtons();
            Renderers.renderHistorical();
          } catch (error) {
            console.error('Error cargando datos:', error);
            if (historicalContent) {
              historicalContent.innerHTML = '<div class="error-message">Error cargando datos. Intenta de nuevo.</div>';
            }
          }
        });
      });
      
      Renderers.renderPeriodButtons();
    },

    /**
     * Configura filtros
     */
    setupFilters() {
      const source = DOMElements.sourceSelect();
      const start = DOMElements.startDate();
      const end = DOMElements.endDate();
      const apply = DOMElements.applyFilters();
      
      if (!source || !start || !end || !apply) return;
      
      source.addEventListener("change", (e) => {
        DataController.updateState({ selectedSource: e.target.value });
        Renderers.renderHistorical();
      });
      
      start.addEventListener("change", (e) => {
        DataController.updateState({ startDate: e.target.value });
      });
      
      end.addEventListener("change", (e) => {
        DataController.updateState({ endDate: e.target.value });
      });
      
      apply.addEventListener("click", () => {
        const state = DataController.getState();
        const periods = [
          { label: "Día", value: "day" },
          { label: "Semana", value: "week" },
          { label: "Mes", value: "month" },
          { label: "Año", value: "year" },
        ];
        
        const periodLabel = periods.find((p) => p.value === state.selectedPeriod)?.label || state.selectedPeriod;
        
        // Mostrar notificación animada
        this.showNotification(`Filtros aplicados:\nPeríodo: ${periodLabel}\nFuente: ${state.selectedSource === "exterior" ? "Exterior" : "Colmena"}\nFecha Inicio: ${state.startDate || "N/A"}\nFecha Fin: ${state.endDate || "N/A"}`);
      });
    },

    /**
     * Configura botón de logout
     */
    setupLogout() {
      const logoutBtn = DOMElements.logoutBtn();
      if (!logoutBtn) return;
      
      logoutBtn.addEventListener("click", () => {
        if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
          // Aquí iría la lógica de logout real
          this.showNotification("Cerrando sesión...");
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
        }
      });
    },

    /**
     * Muestra una notificación temporal
     * @param {string} message - Mensaje a mostrar
     */
    showNotification(message) {
      // Crear elemento de notificación
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideInFromRight 0.3s ease;
        max-width: 300px;
        white-space: pre-line;
      `;
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      // Remover después de 3 segundos
      setTimeout(() => {
        notification.style.animation = 'slideOutToRight 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, 3000);
    }
  };

  // ---------- INICIALIZACIÓN ----------
  const App = {
    /**
     * Inicializa la aplicación frontend
     */
    init() {
      console.log('SmartBee Frontend inicializando...');
      
      // Configurar eventos
      EventHandlers.setupPeriodButtons();
      EventHandlers.setupFilters();
      EventHandlers.setupLogout();
      
      // Renderizar estado inicial
      Renderers.renderAlerts();
      Renderers.renderHistorical();
      
      // Iniciar datos en tiempo real
      RealTimeService.start((data) => {
        Renderers.renderRealtime(data);
      });
      
      // Añadir estilos de animación
      this.addAnimationStyles();
      
      console.log('SmartBee Frontend inicializado correctamente');
    },

    /**
     * Añade estilos CSS para animaciones
     */
    addAnimationStyles() {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInFromRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutToRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes slideInFromLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideInFromBottom {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .list-item:hover {
          transform: translateY(-2px);
          transition: transform 0.2s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .btn:hover {
          transform: translateY(-1px);
          transition: transform 0.2s ease;
        }
        
        .switch {
          transition: all 0.3s ease;
        }
        
        .chart-container {
          transition: opacity 0.3s ease;
        }
      `;
      document.head.appendChild(style);
    },

    /**
     * Limpia recursos al cerrar
     */
    cleanup() {
      RealTimeService.stop();
      ChartManager.destroyChart();
    }
  };

  // ---------- INICIALIZACIÓN AUTOMÁTICA ----------
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });

  // Limpiar al cerrar la página
  window.addEventListener('beforeunload', () => {
    App.cleanup();
  });

  // Exponer API pública
  window.SmartBeeFrontend = {
    App,
    Renderers,
    ChartManager,
    EventHandlers,
    UIUtils
  };

})();