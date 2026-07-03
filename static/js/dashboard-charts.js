(function initDashboardCharts() {
  const root = document.getElementById('dashboardChartsRoot');
  if (!root || typeof Chart === 'undefined') return;

  const charts = {};

  const palette = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: dark ? '#94a3b8' : '#64748b',
      grid: dark ? '#1e293b' : '#f1f5f9',
      primary: '#4f46e5',
      secondary: '#2563eb',
      emerald: '#22c55e',
      amber: '#f59e0b',
      purple: '#8b5cf6',
      rose: '#f43f5e',
      slate: '#94a3b8',
    };
  };

  const donutColors = (c) => [c.emerald, c.primary, c.amber, c.rose, c.secondary, c.purple, c.slate];

  function showState(prefix, state) {
    const skeleton = document.getElementById(`${prefix}Skeleton`);
    const wrap = document.getElementById(`${prefix}Wrap`);
    const demo = document.getElementById(`${prefix}Demo`);
    const empty = document.getElementById(`${prefix}Empty`);
    if (skeleton) skeleton.hidden = state !== 'loading';
    if (wrap) wrap.hidden = state !== 'ready';
    if (demo) demo.hidden = state !== 'demo';
    if (empty) empty.hidden = state !== 'empty';
  }

  function baseOptions(c, legend = false) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: legend
          ? { position: 'bottom', labels: { color: c.text, boxWidth: 12, padding: 14 } }
          : { display: false },
      },
    };
  }

  function renderRevenue(data, isDemo) {
    const c = palette();
    const canvas = document.getElementById('revenueChart');
    if (!canvas || !data?.length) {
      showState('revenueChart', 'empty');
      return;
    }
    showState('revenueChart', isDemo ? 'demo' : 'ready');
    if (charts.revenue) charts.revenue.destroy();
    charts.revenue = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map((d) => d.month),
        datasets: [{
          label: 'Revenue',
          data: data.map((d) => d.revenue),
          borderColor: c.primary,
          backgroundColor: 'rgba(79, 70, 229, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: c.primary,
        }],
      },
      options: {
        ...baseOptions(c),
        scales: {
          x: { grid: { color: c.grid }, ticks: { color: c.text } },
          y: {
            grid: { color: c.grid },
            ticks: {
              color: c.text,
              callback: (v) => `₹${Number(v).toLocaleString('en-IN')}`,
            },
          },
        },
      },
    });
  }

  function renderOccupancy(data, isDemo) {
    const c = palette();
    const canvas = document.getElementById('occupancyChart');
    if (!canvas || !data?.length) {
      showState('occupancyChart', 'empty');
      return;
    }
    showState('occupancyChart', isDemo ? 'demo' : 'ready');
    if (charts.occupancy) charts.occupancy.destroy();
    charts.occupancy = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.name),
        datasets: [{
          data: data.map((d) => d.value),
          backgroundColor: donutColors(c).slice(0, data.length),
          borderWidth: 0,
        }],
      },
      options: {
        ...baseOptions(c, true),
        cutout: '62%',
      },
    });
  }

  function renderBookingTrend(data, isDemo) {
    const c = palette();
    const canvas = document.getElementById('bookingTrendChart');
    if (!canvas || !data?.length) {
      showState('bookingChart', 'empty');
      return;
    }
    showState('bookingChart', isDemo ? 'demo' : 'ready');
    if (charts.booking) charts.booking.destroy();
    charts.booking = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.month),
        datasets: [{
          label: 'Bookings',
          data: data.map((d) => d.bookings),
          backgroundColor: c.secondary,
          borderRadius: 8,
          maxBarThickness: 42,
        }],
      },
      options: {
        ...baseOptions(c),
        scales: {
          x: { grid: { display: false }, ticks: { color: c.text } },
          y: { grid: { color: c.grid }, ticks: { color: c.text, precision: 0 } },
        },
      },
    });
  }

  async function fetchChart(url) {
    const { data } = await axios.get(url);
    if (!data?.ok) throw new Error(data?.error || 'Chart request failed');
    return { rows: data.data || [], isDemo: !!data.isDemo };
  }

  async function loadCharts() {
    showState('revenueChart', 'loading');
    showState('occupancyChart', 'loading');
    showState('bookingChart', 'loading');

    try {
      const [revenue, occupancy, booking] = await Promise.all([
        fetchChart('/api/dashboard/charts/revenue-trend'),
        fetchChart('/api/dashboard/charts/occupancy-status'),
        fetchChart('/api/dashboard/charts/booking-trend'),
      ]);
      renderRevenue(revenue.rows, revenue.isDemo);
      renderOccupancy(occupancy.rows, occupancy.isDemo);
      renderBookingTrend(booking.rows, booking.isDemo);
    } catch (err) {
      console.error(err);
      renderRevenue(
        [
          { month: 'Jan', revenue: 45000 },
          { month: 'Feb', revenue: 52000 },
          { month: 'Mar', revenue: 61000 },
          { month: 'Apr', revenue: 58000 },
          { month: 'May', revenue: 67000 },
          { month: 'Jun', revenue: 72000 },
        ],
        true,
      );
      renderOccupancy(
        [
          { name: 'Available', value: 12 },
          { name: 'Occupied', value: 8 },
          { name: 'Maintenance', value: 2 },
          { name: 'Dirty', value: 3 },
        ],
        true,
      );
      renderBookingTrend(
        [
          { month: 'Jan', bookings: 24 },
          { month: 'Feb', bookings: 31 },
          { month: 'Mar', bookings: 28 },
          { month: 'Apr', bookings: 35 },
          { month: 'May', bookings: 42 },
          { month: 'Jun', bookings: 38 },
        ],
        true,
      );
      window.showToast?.('Loaded sample chart data', 'warning');
    }
  }

  document.addEventListener('DOMContentLoaded', loadCharts);

  document.getElementById('themeToggle')?.addEventListener('click', () => {
    setTimeout(loadCharts, 120);
  });
})();
