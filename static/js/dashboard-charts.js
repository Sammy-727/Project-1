(function initDashboardCharts() {
  const root = document.getElementById('dashboardChartsRoot');
  if (!root || typeof Chart === 'undefined') return;

  let revenueChart = null;

  const palette = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: dark ? '#94a3b8' : '#64748b',
      grid: dark ? '#1e293b' : '#f1f5f9',
      primary: '#4f46e5',
      today: '#059669',
    };
  };

  function showState(prefix, state) {
    const skeleton = document.getElementById(`${prefix}Skeleton`);
    const wrap = document.getElementById(`${prefix}Wrap`);
    const empty = document.getElementById(`${prefix}Empty`);
    if (skeleton) skeleton.hidden = state !== 'loading';
    if (wrap) wrap.hidden = state !== 'ready';
    if (empty) empty.hidden = state !== 'empty';
  }

  function formatInr(value) {
    return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  function renderRevenue(payload) {
    const c = palette();
    const canvas = document.getElementById('revenueChart');
    const rows = payload?.data || [];
    const todayRevenue = payload?.todayRevenue ?? 0;
    const hasRevenue = rows.some((d) => Number(d.revenue) > 0);

    const todayPill = document.getElementById('revenueTodayPill');
    const todayAmount = document.getElementById('revenueTodayAmount');
    if (todayPill && todayAmount) {
      todayAmount.textContent = formatInr(todayRevenue);
      todayPill.hidden = false;
    }

    if (!canvas || !rows.length || !hasRevenue) {
      showState('revenueChart', 'empty');
      return;
    }

    showState('revenueChart', 'ready');
    if (revenueChart) revenueChart.destroy();

    const pointRadius = rows.map((d) => (d.isToday ? 5 : 3));
    const pointBg = rows.map((d) => (d.isToday ? c.today : c.primary));
    const borderColor = rows.map((d) => (d.isToday ? c.today : c.primary));

    revenueChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: rows.map((d) => d.label),
        datasets: [{
          label: 'Revenue',
          data: rows.map((d) => d.revenue),
          borderColor: c.primary,
          backgroundColor: 'rgba(79, 70, 229, 0.08)',
          fill: true,
          tension: 0.35,
          pointRadius,
          pointBackgroundColor: pointBg,
          pointBorderColor: borderColor,
          pointHoverRadius: 6,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const row = rows[idx];
                return row?.isToday ? `${row.label} (Today)` : row?.label;
              },
              label: (ctx) => ` ${formatInr(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: c.text, font: { size: 11 } },
          },
          y: {
            grid: { color: c.grid },
            ticks: {
              color: c.text,
              font: { size: 11 },
              callback: (v) => formatInr(v),
            },
          },
        },
      },
    });
  }

  async function loadCharts() {
    showState('revenueChart', 'loading');
    try {
      const { data } = await axios.get('/api/dashboard/charts/revenue-daily');
      if (!data?.ok) throw new Error(data?.error || 'Chart request failed');
      renderRevenue(data);
    } catch (err) {
      console.error(err);
      showState('revenueChart', 'empty');
    }
  }

  document.addEventListener('DOMContentLoaded', loadCharts);
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    setTimeout(loadCharts, 120);
  });
})();
