class SerialManager {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.onDataReceived = () => {};
    }

    async connect() {
        if (!("serial" in navigator)) {
            alert("Web Serial API not supported by your browser. Please use a modern browser like Chrome or Edge.");
            return false;
        }

        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 9600 });
            
            const textEncoder = new TextEncoderStream();
            textEncoder.readable.pipeTo(this.port.writable);
            this.writer = textEncoder.writable.getWriter();

            const textDecoder = new TextDecoderStream();
            this.port.readable.pipeTo(textDecoder.writable);
            this.reader = textDecoder.readable.getReader();

            this.readLoop();
            return true;
        } catch (error) {
            console.error("There was an error opening the serial port:", error);
            return false;
        }
    }

    async readLoop() {
        let lineBuffer = '';
        while (this.port && this.port.readable) {
            try {
                const { value, done } = await this.reader.read();
                if (done) {
                    this.reader.releaseLock();
                    break;
                }
                lineBuffer += value;
                const lines = lineBuffer.split('\n');
                lineBuffer = lines.pop();

                lines.forEach(line => {
                    if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
                        this.onDataReceived(line.trim());
                    }
                });
            } catch (error) {
                console.error("Error reading from serial port:", error);
                break;
            }
        }
    }

    async write(data) {
        if (this.writer) {
            await this.writer.write(data + '\n');
        } else {
            console.warn("Serial port not connected. Cannot write data.");
        }
    }
}

class SolarTrackingDashboard {
    constructor() {
        this.serialManager = new SerialManager();
        this.charts = {};
        
        this.currentData = {
            sensorData: { ldrTopLeft: 0, ldrTopRight: 0, ldrBottomLeft: 0, ldrBottomRight: 0, temperature: 0 },
            panelPosition: { azimuth: 90, elevation: 90 },
            powerMetrics: { voltage: 0, current: 0, power: 0, efficiency: 0 },
            systemStatus: { mode: "automatic", isActive: false },
        };

        this.historicalData = {
            powerOutput: Array(12).fill(0),
            efficiency: Array(12).fill(0),
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.updateUI();
    }

    setupEventListeners() {
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', async () => {
                const connected = await this.serialManager.connect();
                if (connected) {
                    connectBtn.innerHTML = '<i class="fas fa-check"></i> Connected';
                    connectBtn.disabled = true;
                    this.serialManager.onDataReceived = (jsonData) => this.processArduinoData(jsonData);
                }
            });
        }

        document.getElementById('autoModeBtn').addEventListener('click', () => this.serialManager.write('AUTO'));
        document.getElementById('manualModeBtn').addEventListener('click', () => this.serialManager.write('MANUAL'));
        
        document.getElementById('azimuthSlider').addEventListener('input', (e) => {
            if (this.currentData.systemStatus.mode === 'manual') this.serialManager.write(`H${e.target.value}`)
        });
        document.getElementById('elevationSlider').addEventListener('input', (e) => {
            if (this.currentData.systemStatus.mode === 'manual') this.serialManager.write(`V${e.target.value}`)
        });

        document.getElementById('powerToggle').addEventListener('click', () => {
            this.serialManager.write(this.currentData.systemStatus.isActive ? 'STOP' : 'START');
        });
        document.getElementById('calibrateBtn').addEventListener('click', () => this.serialManager.write('CENTER'));
        document.getElementById('emergencyStop').addEventListener('click', (e) => {
            e.preventDefault();
            this.serialManager.write('STOP');
            this.addAlert('error', 'Software stop command sent to device.');
        });
    }

    processArduinoData(jsonData) {
        try {
            const data = JSON.parse(jsonData);

            if (data.error) {
                this.addAlert('error', data.error);
                return;
            }

            this.currentData.sensorData = {
                ldrTopLeft: data.ldr_tl, ldrTopRight: data.ldr_tr,
                ldrBottomLeft: data.ldr_bl, ldrBottomRight: data.ldr_br,
                temperature: data.temp,
            };
            this.currentData.panelPosition = { azimuth: data.hPos, elevation: data.vPos };
            this.currentData.systemStatus = { mode: data.manual ? 'manual' : 'automatic', isActive: data.active };

            const avgLight = (data.ldr_tl + data.ldr_tr + data.ldr_bl + data.ldr_br) / 4;
            const power = parseFloat((avgLight / 1023) * 40).toFixed(1);
            const voltage = 12.4;
            const current = parseFloat(power / voltage).toFixed(1);
            this.currentData.powerMetrics = {
                power: power, voltage: voltage, current: current,
                efficiency: Math.round((avgLight / 1023) * 95)
            };
            
            this.updateUI();

        } catch (error) {
            console.error("Failed to parse Arduino JSON:", error, "Data:", jsonData);
        }
    }
    
    updateUI() { this.updateMetrics(); this.updateControls(); this.updateSystemInfo(); }

    initializeCharts() {
        this.createPowerChart();
        this.createAnglesChart();
        this.createLDRChart();
        this.createEfficiencyChart();
    }

    createPowerChart() {
        const ctx = document.getElementById('powerChart').getContext('2d');
        const hours = Array.from({length: 12}, (_, i) => `${8 + i}:00`);
        
        this.charts.power = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Power Output (W)',
                    data: this.historicalData.powerOutput,
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Power (W)' } } } }
        });
    }

    createAnglesChart() {
        const ctx = document.getElementById('anglesChart').getContext('2d');
        const hours = Array.from({length: 12}, (_, i) => `${8 + i}:00`);
        
        this.charts.angles = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Azimuth (°)', data: [], borderColor: '#FFC185', yAxisID: 'y'
                }, {
                    label: 'Elevation (°)', data: [], borderColor: '#B4413C', yAxisID: 'y1'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false, }, scales: { y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Azimuth (°)' } }, y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Elevation (°)' }, grid: { drawOnChartArea: false, }, } } }
        });
    }

    createLDRChart() {
        const ctx = document.getElementById('ldrChart').getContext('2d');
        const hours = Array.from({length: 12}, (_, i) => `${8 + i}:00`);
        
        this.charts.ldr = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [
                    { label: 'Top-Left', data: [], borderColor: '#1FB8CD' },
                    { label: 'Top-Right', data: [], borderColor: '#FFC185' },
                    { label: 'Bottom-Left', data: [], borderColor: '#B4413C' },
                    { label: 'Bottom-Right', data: [], borderColor: '#5D878F' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'LDR Reading' } } } }
        });
    }

    createEfficiencyChart() {
        const ctx = document.getElementById('efficiencyChart').getContext('2d');
        const hours = Array.from({length: 12}, (_, i) => `${8 + i}:00`);
        
        this.charts.efficiency = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Tracked Panel', data: this.historicalData.efficiency, backgroundColor: '#1FB8CD'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Efficiency (%)' } } } }
        });
    }

    addAlert(type, message) {
        const container = document.getElementById('alertsContainer');
        if (!container) return;
        
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

        const alertElement = document.createElement('div');
        alertElement.className = `alert-item ${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'warning') icon = 'fa-exclamation-triangle';
        else if (type === 'error') icon = 'fa-exclamation-circle';

        alertElement.innerHTML = `<i class="fas ${icon}"></i><div class="alert-content"><span class="alert-message">${message}</span><span class="alert-time">${timestamp}</span></div>`;
        
        container.prepend(alertElement);
        if (container.children.length > 5) {
            container.removeChild(container.lastChild);
        }
    }

    updateSystemInfo() {
        document.getElementById('weatherCondition').textContent = 'Live Data';
    }
    
    updateSensorBar(sensorId, value) {
        const maxValue = 1023;
        const percentage = (value / maxValue) * 100;
        const selector = `#${sensorId}`.replace('Value', '') + ' .sensor-fill';
        const element = document.querySelector(selector);
        if (element) {
            element.style.width = `${Math.min(percentage, 100)}%`;
        }
    }

    updateMetrics() {
        document.getElementById('ldrTopLeft').textContent = this.currentData.sensorData.ldrTopLeft;
        document.getElementById('ldrTopRight').textContent = this.currentData.sensorData.ldrTopRight;
        document.getElementById('ldrBottomLeft').textContent = this.currentData.sensorData.ldrBottomLeft;
        document.getElementById('ldrBottomRight').textContent = this.currentData.sensorData.ldrBottomRight;
        this.updateSensorBar('ldrTopLeft', this.currentData.sensorData.ldrTopLeft);
        this.updateSensorBar('ldrTopRight', this.currentData.sensorData.ldrTopRight);
        this.updateSensorBar('ldrBottomLeft', this.currentData.sensorData.ldrBottomLeft);
        this.updateSensorBar('ldrBottomRight', this.currentData.sensorData.ldrBottomRight);

        document.getElementById('azimuthValue').textContent = `${this.currentData.panelPosition.azimuth}°`;
        document.getElementById('elevationValue').textContent = `${this.currentData.panelPosition.elevation}°`;
        document.querySelector('.panel-icon').style.transform = `rotate(${this.currentData.panelPosition.azimuth}deg)`;

        document.getElementById('voltageValue').textContent = `${this.currentData.powerMetrics.voltage}V`;
        document.getElementById('currentValue').textContent = `${this.currentData.powerMetrics.current}A`;
        document.getElementById('powerValue').textContent = `${this.currentData.powerMetrics.power}W`;
        
        document.getElementById('temperatureValue').textContent = `${this.currentData.sensorData.temperature}°C`;
        document.getElementById('efficiencyValue').textContent = `${this.currentData.powerMetrics.efficiency}%`;
    }

    updateControls() {
        const isManual = this.currentData.systemStatus.mode === 'manual';
        document.getElementById('autoModeBtn').classList.toggle('active', !isManual);
        document.getElementById('manualModeBtn').classList.toggle('active', isManual);
        document.getElementById('manualControls').classList.toggle('active', isManual);

        document.getElementById('azimuthSlider').value = this.currentData.panelPosition.azimuth;
        document.getElementById('azimuthSliderValue').textContent = `${this.currentData.panelPosition.azimuth}°`;
        document.getElementById('elevationSlider').value = this.currentData.panelPosition.elevation;
        document.getElementById('elevationSliderValue').textContent = `${this.currentData.panelPosition.elevation}°`;

        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        if (this.currentData.systemStatus.isActive) {
            statusIndicator.className = 'status-indicator active';
            statusText.textContent = 'System Active';
        } else {
            statusIndicator.className = 'status-indicator';
            statusText.textContent = 'System Inactive';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.solarDashboard = new SolarTrackingDashboard();
});