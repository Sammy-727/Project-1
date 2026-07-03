(function initPlatformDashboard() {
  const root = document.getElementById('platformDashboardRoot');
  if (!root) return;

  const kpiEls = {
    totalHotels: document.getElementById('platformKpiTotalHotels'),
    activeHotels: document.getElementById('platformKpiActiveHotels'),
    totalRooms: document.getElementById('platformKpiTotalRooms'),
    platformRevenue: document.getElementById('platformKpiPlatformRevenue'),
  };
  const hotelsGrid = document.getElementById('platformHotelsGrid');
  const hotelsEmpty = document.getElementById('platformHotelsEmpty');
  const hotelsLoading = document.getElementById('platformHotelsLoading');
  const viewHotelBase = root.dataset.viewHotelBase || '';

  function formatCurrency(value) {
    const n = Number(value) || 0;
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  function statusBadgeClass(status) {
    if (status === 'Active') return 'badge-Active';
    if (status === 'Suspended') return 'badge-Suspended';
    return 'badge-Archived';
  }

  function renderKpis(totals) {
    if (!totals) return;
    if (kpiEls.totalHotels) kpiEls.totalHotels.textContent = totals.totalHotels ?? 0;
    if (kpiEls.activeHotels) kpiEls.activeHotels.textContent = totals.activeHotels ?? 0;
    if (kpiEls.totalRooms) kpiEls.totalRooms.textContent = totals.totalRooms ?? 0;
    if (kpiEls.platformRevenue) {
      kpiEls.platformRevenue.textContent = formatCurrency(totals.platformRevenue);
    }
  }

  function renderHotelCard(hotel) {
    const viewUrl = `${viewHotelBase}${hotel.hotelId}/view`;
    return `
      <article class="entity-card platform-hotel-card">
        <div class="entity-card-header gradient">
          <div>
            <div class="entity-card-sub">${hotel.hotelCode || ''}</div>
            <div class="entity-card-title">${hotel.hotelName || 'Hotel'}</div>
            <div class="entity-card-sub">${hotel.city || ''}${hotel.state ? `, ${hotel.state}` : ''}</div>
          </div>
          <span class="badge ${statusBadgeClass(hotel.status)}">${hotel.status || 'Active'}</span>
        </div>
        <div class="entity-card-body">
          <div class="platform-hotel-stats">
            <span><i data-lucide="bed-double" class="icon" style="width:14px;height:14px"></i> ${hotel.totalRooms} rooms</span>
            <span><i data-lucide="users" class="icon" style="width:14px;height:14px"></i> ${hotel.totalStaff} staff</span>
            <span><i data-lucide="percent" class="icon" style="width:14px;height:14px"></i> ${hotel.occupancyRate}%</span>
            <span><i data-lucide="indian-rupee" class="icon" style="width:14px;height:14px"></i> ${formatCurrency(hotel.totalRevenue)}</span>
          </div>
          <div class="entity-card-sub">Plan: ${hotel.subscriptionPlan || '—'} · Owner: ${hotel.ownerName || '—'}</div>
          <div class="entity-card-sub platform-hotel-meta">
            Check-ins today: ${hotel.todayCheckIns} · Check-outs today: ${hotel.todayCheckOuts}
          </div>
        </div>
        <div class="entity-card-footer">
          <a href="${viewUrl}" class="btn btn-sm btn-primary">View Dashboard</a>
          <a href="/platform/hotels" class="btn btn-sm btn-ghost">Details</a>
        </div>
      </article>
    `;
  }

  function showLoading(show) {
    if (hotelsLoading) hotelsLoading.hidden = !show;
    if (hotelsGrid) hotelsGrid.hidden = show;
    if (hotelsEmpty) hotelsEmpty.hidden = true;
  }

  function showEmpty() {
    if (hotelsLoading) hotelsLoading.hidden = true;
    if (hotelsGrid) {
      hotelsGrid.hidden = true;
      hotelsGrid.innerHTML = '';
    }
    if (hotelsEmpty) hotelsEmpty.hidden = false;
  }

  async function loadOverview() {
    showLoading(true);
    try {
      const { data } = await axios.get('/api/platform/hotels/overview');
      if (!data?.ok) throw new Error(data?.error || 'Failed to load platform overview');

      renderKpis(data.totals);
      const hotels = data.hotels || [];

      if (!hotels.length) {
        showEmpty();
        return;
      }

      if (hotelsLoading) hotelsLoading.hidden = true;
      if (hotelsEmpty) hotelsEmpty.hidden = true;
      if (hotelsGrid) {
        hotelsGrid.hidden = false;
        hotelsGrid.innerHTML = hotels.map(renderHotelCard).join('');
      }

      window.lucide?.createIcons?.();
    } catch (err) {
      console.error(err);
      window.showToast?.(err.response?.data?.error || err.message || 'Failed to load platform data', 'danger');
      showEmpty();
    }
  }

  loadOverview();
})();
