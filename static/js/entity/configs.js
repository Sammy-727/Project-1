import { escapeHtml, formatAmount, statusBadge } from '../shared/utils.js';

function drawerBtn(selector, label, icon = 'eye') {
  return `<button type="button" class="btn btn-ghost btn-sm" data-app-drawer-selector="${selector}" title="${label}">
    <i data-lucide="${icon}" class="icon"></i></button>`;
}

function modalBtn(target, label, icon = 'pencil') {
  return `<button type="button" class="btn btn-ghost btn-sm modal-trigger" data-target="${target}" title="${label}">
    <i data-lucide="${icon}" class="icon"></i></button>`;
}

export const ENTITY_CONFIGS = {
  guests: {
    key: 'guests',
    label: 'Guests',
    apiUrl: '/api/customers/list',
    itemsKey: 'customers',
    formSelector: '#guestsFilterForm',
    cardGrid: '#guestCardGrid',
    switcherMount: '#guestsViewSwitcher',
    toolbarMount: '#guestsToolbar',
    tableMount: '#guestsTableView',
    defaultSort: 'name',
    defaultSortDir: 'desc',
    views: [
      { id: 'cards', label: 'Card View', short: 'Cards', icon: 'layout-grid' },
      { id: 'table', label: 'Table View', short: 'Table', icon: 'table' },
    ],
    sortKeys: {
      id: (r) => r.id,
      name: (r) => (r.name || '').toLowerCase(),
      phone: (r) => r.phone || '',
      email: (r) => (r.email || '').toLowerCase(),
      date: (r) => r.id,
    },
    columns: [
      { key: 'name', label: 'Guest', sortable: true, render: (r) => `<strong>${escapeHtml(r.name)}</strong>` },
      { key: 'phone', label: 'Phone', sortable: true },
      { key: 'email', label: 'Email', sortable: true, render: (r) => escapeHtml(r.email || '—') },
      { key: 'guest_type', label: 'Type', sortable: false },
      { key: 'booking_count', label: 'Stays', sortable: false },
      { key: 'loyalty', label: 'Loyalty', sortable: false, render: (r) => statusBadge(r.loyalty) },
    ],
    exportHeaders: ['ID', 'Name', 'Phone', 'Email', 'Type', 'Stays', 'Loyalty'],
    exportRow: (r) => [r.id, r.name, r.phone, r.email || '', r.guest_type, r.booking_count, r.loyalty],
    actions: (r) => `
      <div class="table-actions">
        ${drawerBtn(`#drawerGuest${r.id}`, 'View Profile')}
        ${modalBtn(`#editCustomer${r.id}`, 'Edit')}
        <button type="button" class="btn btn-ghost btn-sm" data-app-drawer-action="booking" data-booking-customer="${r.id}" title="New Booking">
          <i data-lucide="calendar-plus" class="icon"></i>
        </button>
      </div>`,
  },

  rooms: {
    key: 'rooms',
    label: 'Rooms',
    apiUrl: '/api/rooms/list',
    itemsKey: 'rooms',
    formSelector: '#roomsFilterForm',
    cardGrid: '#roomCardGrid',
    floorView: '#floorView',
    switcherMount: '#roomsViewSwitcher',
    toolbarMount: '#roomsToolbar',
    tableMount: '#roomsTableView',
    defaultSort: 'room_no',
    defaultSortDir: 'asc',
    views: [
      { id: 'cards', label: 'Card View', short: 'Cards', icon: 'layout-grid' },
      { id: 'table', label: 'Table View', short: 'Table', icon: 'table' },
      { id: 'floor', label: 'Floor View', short: 'Floor', icon: 'layers' },
    ],
    sortKeys: {
      room_no: (r) => parseInt(r.room_no, 10) || r.room_no,
      type: (r) => (r.room_type || '').toLowerCase(),
      floor: (r) => Number(r.floor || 0),
      price: (r) => Number(r.price || 0),
      capacity: (r) => Number(r.capacity || 0),
      status: (r) => (r.status || '').toLowerCase(),
    },
    columns: [
      { key: 'room_no', label: 'Room', sortable: true, render: (r) => `<strong>${escapeHtml(r.room_no)}</strong>` },
      { key: 'room_type', label: 'Type', sortable: true },
      { key: 'floor', label: 'Floor', sortable: true },
      { key: 'capacity', label: 'Capacity', sortable: true },
      { key: 'price', label: 'Price/night', sortable: true, render: (r) => `₹${formatAmount(r.price)}` },
      { key: 'status', label: 'Status', sortable: true, render: (r) => statusBadge(r.status) },
    ],
    exportHeaders: ['Room', 'Type', 'Floor', 'Capacity', 'Price', 'Status'],
    exportRow: (r) => [r.room_no, r.room_type, r.floor, r.capacity, r.price, r.status],
    actions: (r) => `
      <div class="table-actions">
        ${drawerBtn(`#drawerRoom${r.id}`, 'View')}
        ${modalBtn(`#editRoom${r.id}`, 'Edit')}
        <button type="button" class="btn btn-ghost btn-sm" data-app-drawer-action="booking" data-booking-room="${escapeHtml(r.room_no)}" title="Book">
          <i data-lucide="calendar-plus" class="icon"></i>
        </button>
      </div>`,
  },

  employees: {
    key: 'employees',
    label: 'Employees',
    apiUrl: '/api/employees/list',
    itemsKey: 'employees',
    formSelector: '#employeesFilterForm',
    cardGrid: '#employeeCardGrid',
    switcherMount: '#employeesViewSwitcher',
    toolbarMount: '#employeesToolbar',
    tableMount: '#employeesTableView',
    defaultSort: 'name',
    defaultSortDir: 'asc',
    views: [
      { id: 'cards', label: 'Card View', short: 'Cards', icon: 'layout-grid' },
      { id: 'table', label: 'Table View', short: 'Table', icon: 'table' },
    ],
    sortKeys: {
      name: (r) => (r.name || '').toLowerCase(),
      role: (r) => (r.role || '').toLowerCase(),
      department: (r) => (r.department || '').toLowerCase(),
      status: (r) => (r.status || '').toLowerCase(),
      date: (r) => r.joining_date || '',
    },
    columns: [
      { key: 'name', label: 'Name', sortable: true, render: (r) => `<strong>${escapeHtml(r.name)}</strong>` },
      { key: 'role', label: 'Role', sortable: true },
      { key: 'department', label: 'Department', sortable: true, render: (r) => escapeHtml(r.department || '—') },
      { key: 'phone', label: 'Phone', sortable: false, render: (r) => escapeHtml(r.phone || '—') },
      { key: 'shift', label: 'Shift', sortable: false, render: (r) => escapeHtml(r.shift || '—') },
      { key: 'status', label: 'Status', sortable: true, render: (r) => statusBadge(r.status) },
    ],
    exportHeaders: ['ID', 'Name', 'Role', 'Department', 'Phone', 'Shift', 'Status'],
    exportRow: (r) => [r.id, r.name, r.role, r.department || '', r.phone || '', r.shift || '', r.status],
    actions: (r) => `
      <div class="table-actions">
        ${drawerBtn(`#drawerEmp${r.id}`, 'View')}
        ${modalBtn(`#editEmp${r.id}`, 'Edit')}
      </div>`,
  },

  inventory: {
    key: 'inventory',
    label: 'Inventory',
    apiUrl: '/api/inventory/list',
    itemsKey: 'items',
    formSelector: '#inventoryFilterForm',
    cardGrid: '#inventoryCardGrid',
    switcherMount: '#inventoryViewSwitcher',
    toolbarMount: '#inventoryToolbar',
    tableMount: '#inventoryTableView',
    defaultSort: 'name',
    defaultSortDir: 'asc',
    views: [
      { id: 'cards', label: 'Card View', short: 'Cards', icon: 'layout-grid' },
      { id: 'table', label: 'Table View', short: 'Table', icon: 'table' },
    ],
    sortKeys: {
      name: (r) => (r.item_name || '').toLowerCase(),
      category: (r) => (r.category || '').toLowerCase(),
      stock: (r) => Number(r.quantity || 0),
      date: (r) => r.last_updated || '',
    },
    columns: [
      { key: 'item_name', label: 'Item', sortable: true, render: (r) => `<strong>${escapeHtml(r.item_name)}</strong>` },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'quantity', label: 'Stock', sortable: true, render: (r) => `${r.quantity} ${escapeHtml(r.unit || '')}` },
      { key: 'reorder_level', label: 'Min Level', sortable: false },
      { key: 'price', label: 'Price', sortable: false, render: (r) => `₹${formatAmount(r.price)}` },
      { key: 'supplier_name', label: 'Supplier', sortable: false, render: (r) => escapeHtml(r.supplier_name || '—') },
      { key: 'stock_status', label: 'Status', sortable: false, render: (r) => {
        const label = r.stock_status === 'low' ? 'Low Stock' : (r.stock_status === 'out' ? 'Out of Stock' : 'In Stock');
        const cls = r.stock_status === 'low' ? 'danger' : (r.stock_status === 'out' ? 'Cancelled' : 'Available');
        return `<span class="badge badge-${cls}">${label}</span>`;
      }},
    ],
    exportHeaders: ['ID', 'Item', 'Category', 'Stock', 'Unit', 'Min Level', 'Price', 'Supplier', 'Status'],
    exportRow: (r) => [r.id, r.item_name, r.category, r.quantity, r.unit, r.reorder_level, r.price, r.supplier_name || '', r.stock_status],
    actions: (r) => modalBtn(`#editInv${r.id}`, 'Edit'),
  },

  housekeeping: {
    key: 'housekeeping',
    label: 'Housekeeping',
    apiUrl: '/api/housekeeping/list',
    itemsKey: 'tasks',
    formSelector: '#housekeepingFilterForm',
    kanbanBoard: '#housekeepingKanban',
    switcherMount: '#housekeepingViewSwitcher',
    toolbarMount: '#housekeepingToolbar',
    tableMount: '#housekeepingTableView',
    defaultView: 'kanban',
    defaultSort: 'id',
    defaultSortDir: 'desc',
    views: [
      { id: 'kanban', label: 'Kanban View', short: 'Kanban', icon: 'columns-3' },
      { id: 'table', label: 'Table View', short: 'Table', icon: 'table' },
    ],
    sortKeys: {
      id: (r) => r.id,
      room: (r) => r.room_no || '',
      priority: (r) => (r.priority || '').toLowerCase(),
      status: (r) => (r.status || '').toLowerCase(),
      date: (r) => r.created_at || '',
    },
    columns: [
      { key: 'room_no', label: 'Room', sortable: true, render: (r) => `<strong>${escapeHtml(r.room_no)}</strong>` },
      { key: 'room_type', label: 'Type', sortable: false },
      { key: 'staff_name', label: 'Staff', sortable: false, render: (r) => escapeHtml(r.staff_name || 'Unassigned') },
      { key: 'priority', label: 'Priority', sortable: true, render: (r) => statusBadge(r.priority) },
      { key: 'status', label: 'Status', sortable: true, render: (r) => statusBadge(r.status) },
      { key: 'created_at', label: 'Created', sortable: true },
    ],
    exportHeaders: ['ID', 'Room', 'Type', 'Staff', 'Priority', 'Status', 'Created'],
    exportRow: (r) => [r.id, r.room_no, r.room_type, r.staff_name || '', r.priority, r.status, r.created_at],
    actions: (r) => modalBtn(`#editHK${r.id}`, 'Update'),
  },
};
