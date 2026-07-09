/** Build client-side filter function from form data — single filter logic for all views */

const like = (hay, needle) => !needle || String(hay || '').toLowerCase().includes(needle.toLowerCase());

export function buildFilterFn(formData, rules = {}) {
  const params = {};
  formData.forEach((value, key) => {
    if (value != null && String(value).trim() !== '') params[key] = String(value).trim();
  });

  return (row) => {
    if (params.q) {
      const blob = rules.searchFields
        ? rules.searchFields.map((f) => row[f]).join(' ')
        : Object.values(row).join(' ');
      if (!like(blob, params.q)) return false;
    }
    if (params.status && params.status !== 'all') {
      const val = String(row[rules.statusField || 'status'] || '').toLowerCase();
      const filter = params.status.toLowerCase();
      if (rules.statusMap?.[params.status]) {
        if (!rules.statusMap[params.status](row)) return false;
      } else if (val !== filter) return false;
    }
    if (params.payment_status && row.payment_status !== params.payment_status) return false;
    if (params.department && row.department !== params.department) return false;
    if (params.role && row.role !== params.role) return false;
    if (params.category && row.category !== params.category) return false;
    if (params.request_type && row.request_type !== params.request_type) return false;
    if (params.guest_type) {
      const bc = row.booking_count || 0;
      if (params.guest_type === 'new' && bc > 1) return false;
      if (params.guest_type === 'returning' && bc <= 1) return false;
    }
    if (params.stock_status) {
      const s = row.stock_status || '';
      if (params.stock_status === 'low' && s !== 'low') return false;
      if (params.stock_status === 'in_stock' && s !== 'in_stock') return false;
      if (params.stock_status === 'out' && s !== 'out') return false;
    }
    if (params.type && row.room_type !== params.type && row.category !== params.type) return false;
    if (params.floor && String(row.floor) !== params.floor) return false;
    if (params.capacity && String(row.capacity) !== params.capacity) return false;
    if (params.price_min && Number(row.price) < Number(params.price_min)) return false;
    if (params.price_max && Number(row.price) > Number(params.price_max)) return false;
    if (params.amount_min && Number(row.amount || row.total_amount || row.total || 0) < Number(params.amount_min)) return false;
    if (params.amount_max && Number(row.amount || row.total_amount || row.total || 0) > Number(params.amount_max)) return false;
    if (params.booking_id && String(row.booking_id) !== params.booking_id) return false;
    if (params.room_no && !like(row.room_no, params.room_no)) return false;
    if (params.priority && row.priority !== params.priority) return false;
    if (params.email && !like(row.email, params.email)) return false;
    if (params.city && !like(row.address, params.city)) return false;
    if (params.supplier && !like(row.supplier_name, params.supplier)) return false;
    if (params.payment_mode && row.payment_mode !== params.payment_mode) return false;
    if (params.assigned_to && String(row.assigned_to) !== params.assigned_to) return false;
    if (params.id_proof_type && row.id_proof_type !== params.id_proof_type) return false;
  if (params.shift && !like(row.shift, params.shift)) return false;
    if (params.from && (row.created_at || row.payment_date || row.bill_date || row.joining_date || row.last_updated || '') < params.from) return false;
    if (params.to && (row.created_at || row.payment_date || row.bill_date || row.joining_date || row.last_updated || '') > params.to) return false;
    if (rules.custom) return rules.custom(row, params);
    return true;
  };
}
