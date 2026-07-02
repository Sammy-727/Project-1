import {
  renderPaymentAlert,
  renderInventoryAlert,
  renderCheckinAlert,
  renderCheckoutAlert,
} from './AlertCard.js';

export function renderAlertSection(title, icon, tone, html, emptyText) {
  const hasContent = html && html.trim().length > 0;
  return `
    <section class="alert-section alert-section-${tone}">
      <header class="alert-section-head">
        <i data-lucide="${icon}" class="icon"></i>
        <h3>${title}</h3>
      </header>
      <div class="alert-section-body">
        ${hasContent ? html : `<p class="alert-section-empty">${emptyText || 'No alerts in this section.'}</p>`}
      </div>
    </section>`;
}

export function renderPaymentsSection(alerts) {
  const html = (alerts || []).map(renderPaymentAlert).join('');
  return renderAlertSection('Pending Payments', 'credit-card', 'red', html);
}

export function renderInventorySection(alerts) {
  const html = (alerts || []).map(renderInventoryAlert).join('');
  return renderAlertSection('Low Inventory', 'package', 'red', html);
}

function dateLabel(isoDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function renderArrivalsSection(checkIns, checkOuts) {
  const byDate = {};
  (checkIns || []).forEach((a) => {
    if (!byDate[a.date]) byDate[a.date] = { checkins: [], checkouts: [] };
    byDate[a.date].checkins.push(a);
  });
  (checkOuts || []).forEach((a) => {
    if (!byDate[a.date]) byDate[a.date] = { checkins: [], checkouts: [] };
    byDate[a.date].checkouts.push(a);
  });

  const dates = Object.keys(byDate).sort();
  if (!dates.length) {
    return renderAlertSection('Upcoming Arrivals & Departures', 'calendar-days', 'yellow', '', 'No arrivals or departures in the next 7 days.');
  }

  const html = dates.map((date) => {
    const group = byDate[date];
    const checkinHtml = group.checkins.length
      ? `<div class="alert-date-group-label">Check-ins</div>${group.checkins.map(renderCheckinAlert).join('')}`
      : '';
    const checkoutHtml = group.checkouts.length
      ? `<div class="alert-date-group-label">Check-outs</div>${group.checkouts.map(renderCheckoutAlert).join('')}`
      : '';
    return `
      <div class="alert-date-group">
        <div class="alert-date-head">${dateLabel(date)} <span class="muted">${date}</span></div>
        ${checkinHtml}
        ${checkoutHtml}
      </div>`;
  }).join('');

  return renderAlertSection('Upcoming Arrivals & Departures', 'calendar-days', 'yellow', html);
}
