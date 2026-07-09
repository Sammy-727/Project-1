import { escapeHtml, formatAmount } from '../shared/utils.js';
import { statusBadge } from '../shared/views/StatusBadge.js';
import { renderActionMenu } from '../shared/views/ActionMenu.js';
import { kanbanCardHtml } from '../shared/views/KanbanView.js';
import { bindRowActions } from '../shared/views/bindActions.js';

function guestActions(r) {
  return renderActionMenu([
    { type: 'button', label: 'View Profile', icon: 'eye', drawer: `#drawerGuest${r.id}` },
    { type: 'button', label: 'Edit', icon: 'pencil', modal: `#editCustomer${r.id}` },
    { type: 'button', label: 'New Booking', icon: 'calendar-plus', bookingCustomer: String(r.id) },
  ]);
}

function roomActions(r) {
  return renderActionMenu([
    { type: 'button', label: 'View', icon: 'eye', drawer: `#drawerRoom${r.id}` },
    { type: 'button', label: 'Edit', icon: 'pencil', modal: `#editRoom${r.id}` },
    { type: 'button', label: 'Book', icon: 'calendar-plus', bookingRoom: r.room_no },
  ]);
}

function employeeActions(r) {
  return renderActionMenu([
    { type: 'button', label: 'View', icon: 'eye', drawer: `#drawerEmp${r.id}` },
    { type: 'button', label: 'Edit', icon: 'pencil', modal: `#editEmp${r.id}` },
  ]);
}

function inventoryActions(r) {
  return renderActionMenu([{ type: 'button', label: 'Edit', icon: 'pencil', modal: `#editInv${r.id}` }]);
}

function hkActions(r) {
  return renderActionMenu([{ type: 'button', label: 'Update', icon: 'pencil', modal: `#editHK${r.id}` }]);
}

function userActions(r) {
  return renderActionMenu([
    { type: 'button', label: 'View Details', icon: 'eye', modal: `#viewUser${r.id}` },
    { type: 'button', label: 'Edit', icon: 'pencil', modal: `#editUser${r.id}` },
  ]);
}

function serviceActions(r) {
  return renderActionMenu([{ type: 'button', label: 'Update', icon: 'pencil', modal: `#editRS${r.id}` }]);
}

function invoiceActions(r) {
  return renderActionMenu([
    { type: 'link', label: 'View Invoice', icon: 'file-text', href: `/invoice/${r.booking_id}` },
  ]);
}

function billingActions(r) {
  return renderActionMenu([
    { type: 'link', label: 'View Receipt', icon: 'file-text', href: `/receipt/${r.id}`, target: '_blank' },
  ]);
}

function cardModalBtn(target, label) {
  return `<button type="button" class="btn btn-ghost btn-sm modal-trigger" data-target="${target}">${escapeHtml(label)}</button>`;
}

const CARD_TABLE = [
  { id: 'cards', label: 'Card View', short: 'Cards', icon: 'layout-grid' },
  { id: 'table', label: 'Table View', short: 'Table', icon: 'table' },
];

const TABLE_CARD = [
  { id: 'table', label: 'Table View', short: 'Table', icon: 'table' },
  { id: 'cards', label: 'Card View', short: 'Cards', icon: 'layout-grid' },
];

export const PAGE_CONFIGS = {
  guests: {
    key: 'guests',
    label: 'Guests',
    dataSource: 'api',
    apiUrl: '/api/customers/list',
    itemsKey: 'customers',
    bootstrapId: 'guestsBootstrap',
    formSelector: '#guestsFilterForm',
    switcherMount: '#guestsViewSwitcher',
    toolbarMount: '#guestsToolbar',
    tableMount: '#guestsTableView',
    ssrGrid: '#guestCardGrid',
    views: CARD_TABLE,
    defaultSort: 'name',
    defaultSortDir: 'desc',
    filterRules: { searchFields: ['name', 'phone', 'email'] },
    sortKeys: {
      id: (r) => r.id, name: (r) => (r.name || '').toLowerCase(),
      phone: (r) => r.phone || '', email: (r) => (r.email || '').toLowerCase(), date: (r) => r.id,
    },
    columns: [
      { key: 'name', label: 'Guest', sortable: true, render: (r) => `<span class="list-cell-primary">${escapeHtml(r.name)}</span>` },
      { key: 'phone', label: 'Phone', sortable: true },
      { key: 'email', label: 'Email', sortable: true, render: (r) => escapeHtml(r.email || '—') },
      { key: 'guest_type', label: 'Type', sortable: false },
      { key: 'booking_count', label: 'Stays', sortable: false },
      { key: 'loyalty', label: 'Loyalty', sortable: false, render: (r) => statusBadge(r.loyalty) },
    ],
    exportHeaders: ['ID', 'Name', 'Phone', 'Email', 'Type', 'Stays', 'Loyalty'],
    exportRow: (r) => [r.id, r.name, r.phone, r.email || '', r.guest_type, r.booking_count, r.loyalty],
    actions: guestActions,
    onRowClick: (r) => window.AppDrawer?.openDrawerSelector?.(`#drawerGuest${r.id}`),
  },

  rooms: {
    key: 'rooms',
    label: 'Rooms',
    dataSource: 'api',
    apiUrl: '/api/rooms/list',
    itemsKey: 'rooms',
    formSelector: '#roomsFilterForm',
    switcherMount: '#roomsViewSwitcher',
    toolbarMount: '#roomsToolbar',
    tableMount: '#roomsTableView',
    floorMount: '#roomsFloorView',
    ssrGrid: '#roomCardGrid',
    views: [
      ...CARD_TABLE,
      { id: 'floor', label: 'Floor View', short: 'Floor', icon: 'layers' },
    ],
    defaultSort: 'room_no',
    defaultSortDir: 'asc',
    filterRules: { searchFields: ['room_no', 'room_type', 'status'], statusField: 'status' },
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
    actions: roomActions,
    onRowClick: (r) => window.AppDrawer?.openDrawerSelector?.(`#drawerRoom${r.id}`),
  },

  employees: {
    key: 'employees',
    label: 'Employees',
    dataSource: 'api',
    apiUrl: '/api/employees/list',
    itemsKey: 'employees',
    formSelector: '#employeesFilterForm',
    switcherMount: '#employeesViewSwitcher',
    toolbarMount: '#employeesToolbar',
    tableMount: '#employeesTableView',
    ssrGrid: '#employeeCardGrid',
    views: CARD_TABLE,
    defaultSort: 'name',
    bulkSelect: true,
    filterRules: {
      searchFields: ['name', 'role', 'department', 'phone'],
      statusField: 'status',
      statusMap: {
        active: (r) => r.status === 'Active',
        inactive: (r) => r.status === 'Inactive',
        archived: (r) => r.status === 'Archived',
      },
    },
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
    actions: employeeActions,
    onRowClick: (r) => window.AppDrawer?.openDrawerSelector?.(`#drawerEmp${r.id}`),
  },

  inventory: {
    key: 'inventory',
    label: 'Inventory',
    dataSource: 'api',
    apiUrl: '/api/inventory/list',
    itemsKey: 'items',
    formSelector: '#inventoryFilterForm',
    switcherMount: '#inventoryViewSwitcher',
    toolbarMount: '#inventoryToolbar',
    tableMount: '#inventoryTableView',
    ssrGrid: '#inventoryCardGrid',
    views: CARD_TABLE,
    defaultSort: 'name',
    filterRules: { searchFields: ['item_name', 'category', 'supplier_name'] },
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
        return statusBadge(label);
      }},
    ],
    exportHeaders: ['ID', 'Item', 'Category', 'Stock', 'Unit', 'Min Level', 'Price', 'Supplier'],
    exportRow: (r) => [r.id, r.item_name, r.category, r.quantity, r.unit, r.reorder_level, r.price, r.supplier_name || ''],
    actions: inventoryActions,
  },

  housekeeping: {
    key: 'housekeeping',
    label: 'Housekeeping',
    dataSource: 'api',
    apiUrl: '/api/housekeeping/list',
    itemsKey: 'tasks',
    formSelector: '#housekeepingFilterForm',
    switcherMount: '#housekeepingViewSwitcher',
    toolbarMount: '#housekeepingToolbar',
    tableMount: '#housekeepingTableView',
    kanbanMount: '#housekeepingKanbanView',
    cardMount: '#housekeepingCardView',
    ssrKanban: '#housekeepingKanban',
    views: [
      { id: 'kanban', label: 'Kanban View', short: 'Kanban', icon: 'columns-3' },
      { id: 'cards', label: 'Card View', short: 'Cards', icon: 'layout-grid' },
      { id: 'table', label: 'Table View', short: 'Table', icon: 'table' },
    ],
    defaultView: 'kanban',
    filterRules: { searchFields: ['room_no', 'staff_name', 'notes', 'room_type'] },
    sortKeys: {
      id: (r) => r.id, room: (r) => r.room_no || '',
      priority: (r) => (r.priority || '').toLowerCase(),
      status: (r) => (r.status || '').toLowerCase(),
      date: (r) => r.created_at || '',
    },
    kanban: {
      statusField: 'status',
      columns: ['Pending', 'In Progress', 'Completed'],
      renderCard: (r) => kanbanCardHtml(r, {
        title: `Room ${r.room_no}`,
        subtitle: r.room_type,
        badges: [statusBadge(r.priority), statusBadge(r.status)],
        footer: `<div class="muted" style="margin-top:6px">${escapeHtml(r.staff_name || 'Unassigned')} · ${escapeHtml(r.created_at || '')}</div>
          <button type="button" class="btn btn-ghost btn-sm modal-trigger" data-target="#editHK${r.id}" style="margin-top:8px">Update</button>`,
      }),
      bindCards: bindRowActions,
    },
    renderCard: (r) => `
      <article class="entity-card" data-entity-id="${r.id}" data-card-drawer="">
        <div class="entity-card-header">
          <div><div class="entity-card-sub">Room ${escapeHtml(r.room_no)}</div>
          <div class="entity-card-title">${escapeHtml(r.room_type || '')}</div></div>
          ${statusBadge(r.status)}
        </div>
        <div class="entity-card-body">
          <div class="entity-card-stats">
            <div class="entity-stat">Staff<strong>${escapeHtml(r.staff_name || 'Unassigned')}</strong></div>
            <div class="entity-stat">Priority<strong>${escapeHtml(r.priority)}</strong></div>
          </div>
        </div>
        <div class="entity-card-footer">${statusBadge(r.priority)} ${cardModalBtn(`#editHK${r.id}`, 'Update')}</div>
      </article>`,
    bindCards: bindRowActions,
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
    actions: hkActions,
  },

  users: {
    key: 'users',
    label: 'Users',
    dataSource: 'bootstrap',
    bootstrapId: 'usersBootstrap',
    itemsKey: 'users',
    formSelector: '#usersFilterForm',
    switcherMount: '#usersViewSwitcher',
    toolbarMount: '#usersToolbar',
    tableMount: '#usersTableView',
    cardMount: '#usersCardView',
    views: TABLE_CARD,
    defaultView: 'table',
    defaultSort: 'username',
    bulkSelect: true,
    filterRules: {
      searchFields: ['username', 'full_name', 'role'],
      statusField: 'status',
      statusMap: {
        active: (r) => r.status === 'Active',
        inactive: (r) => r.status === 'Inactive',
        archived: (r) => r.status === 'Archived',
      },
    },
    sortKeys: {
      username: (r) => (r.username || '').toLowerCase(),
      name: (r) => (r.full_name || '').toLowerCase(),
      role: (r) => (r.role || '').toLowerCase(),
      status: (r) => (r.status || '').toLowerCase(),
      date: (r) => r.last_login || '',
    },
    columns: [
      { key: 'username', label: 'Username', sortable: true, render: (r) => `<strong>${escapeHtml(r.username)}</strong>` },
      { key: 'full_name', label: 'Full Name', sortable: true },
      { key: 'role', label: 'Role', sortable: true },
      { key: 'status', label: 'Status', sortable: true, render: (r) => statusBadge(r.status) },
      { key: 'last_login', label: 'Last Login', sortable: false, render: (r) => escapeHtml(r.last_login || '—') },
    ],
    renderCard: (r) => `
      <article class="entity-card" data-entity-id="${r.id}">
        <div class="entity-card-header gradient">
          <div><div class="entity-card-title">${escapeHtml(r.full_name || r.username)}</div>
          <div class="entity-card-sub">@${escapeHtml(r.username)} · ${escapeHtml(r.role)}</div></div>
          ${statusBadge(r.status)}
        </div>
        <div class="entity-card-footer">${cardModalBtn(`#viewUser${r.id}`, 'View')} ${cardModalBtn(`#editUser${r.id}`, 'Edit')}</div>
      </article>`,
    bindCards: bindRowActions,
    actions: userActions,
  },

  services: {
    key: 'services',
    label: 'Room Service',
    dataSource: 'bootstrap',
    bootstrapId: 'servicesBootstrap',
    itemsKey: 'requests',
    formSelector: '#servicesFilterForm',
    switcherMount: '#servicesViewSwitcher',
    toolbarMount: '#servicesToolbar',
    tableMount: '#servicesTableView',
    ssrGrid: '#serviceRequestGrid',
    views: CARD_TABLE,
    filterRules: { searchFields: ['room_no', 'request_type', 'customer_name', 'description'], statusField: 'status' },
    sortKeys: {
      room: (r) => r.room_no || '', type: (r) => (r.request_type || '').toLowerCase(),
      status: (r) => (r.status || '').toLowerCase(), date: (r) => r.created_at || '',
    },
    columns: [
      { key: 'room_no', label: 'Room', sortable: true, render: (r) => `<strong>${escapeHtml(r.room_no)}</strong>` },
      { key: 'request_type', label: 'Type', sortable: true },
      { key: 'customer_name', label: 'Guest', sortable: false, render: (r) => escapeHtml(r.customer_name || '—') },
      { key: 'status', label: 'Status', sortable: true, render: (r) => statusBadge(r.status) },
      { key: 'charges', label: 'Charges', sortable: false, render: (r) => `₹${formatAmount(r.charges)}` },
      { key: 'created_at', label: 'Created', sortable: true },
    ],
    actions: serviceActions,
  },

  maintenance: {
    key: 'maintenance',
    label: 'Maintenance',
    dataSource: 'bootstrap',
    bootstrapId: 'maintenanceBootstrap',
    itemsKey: 'items',
    formSelector: '#maintenanceFilterForm',
    switcherMount: '#maintenanceViewSwitcher',
    toolbarMount: '#maintenanceToolbar',
    tableMount: '#maintenanceTableView',
    kanbanMount: '#maintenanceKanbanView',
    cardMount: '#maintenanceCardView',
    views: [
      { id: 'kanban', label: 'Kanban View', short: 'Kanban', icon: 'columns-3' },
      { id: 'cards', label: 'Card View', short: 'Cards', icon: 'layout-grid' },
      { id: 'table', label: 'Table View', short: 'Table', icon: 'table' },
    ],
    defaultView: 'kanban',
    filterRules: { searchFields: ['room_no', 'description', 'request_type'] },
    sortKeys: {
      room: (r) => r.room_no || '', status: (r) => (r.status || '').toLowerCase(), date: (r) => r.created_at || '',
    },
    kanban: {
      statusField: 'status',
      columns: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
      renderCard: (r) => kanbanCardHtml(r, {
        title: `Room ${r.room_no}`,
        subtitle: r.description || 'Maintenance',
        badges: [statusBadge(r.status)],
        footer: `<span class="muted">${escapeHtml(r.created_at || '')}</span>`,
      }),
    },
    renderCard: (r) => `
      <article class="entity-card status-Maintenance" data-entity-id="${r.id}">
        <div class="entity-card-title">Room ${escapeHtml(r.room_no)}</div>
        <div class="entity-card-sub">${escapeHtml(r.description || 'Maintenance')}</div>
        <div style="margin-top:8px">${statusBadge(r.status)}</div>
      </article>`,
    columns: [
      { key: 'room_no', label: 'Room', sortable: true },
      { key: 'description', label: 'Issue', sortable: false, render: (r) => escapeHtml(r.description || '—') },
      { key: 'status', label: 'Status', sortable: true, render: (r) => statusBadge(r.status) },
      { key: 'created_at', label: 'Reported', sortable: true },
    ],
    actions: serviceActions,
  },

  billing: {
    key: 'billing',
    label: 'Billing',
    dataSource: 'bootstrap',
    bootstrapId: 'billingBootstrap',
    itemsKey: 'payments',
    formSelector: '#billingFilterForm',
    switcherMount: '#billingViewSwitcher',
    toolbarMount: '#billingToolbar',
    tableMount: '#billingTableView',
    ssrGrid: '#billingPendingGrid',
    views: [
      { id: 'cards', label: 'Card Summary', short: 'Cards', icon: 'layout-grid' },
      { id: 'table', label: 'Table View', short: 'Table', icon: 'table' },
    ],
    defaultView: 'cards',
    filterRules: { searchFields: ['receipt_number', 'customer_name', 'room_no'] },
    sortKeys: {
      id: (r) => r.id, guest: (r) => (r.customer_name || '').toLowerCase(),
      amount: (r) => Number(r.amount || 0), date: (r) => r.payment_date || '', mode: (r) => (r.payment_mode || '').toLowerCase(),
    },
    columns: [
      { key: 'receipt_number', label: 'Receipt', sortable: true, render: (r) => `<strong>${escapeHtml(r.receipt_number)}</strong>` },
      { key: 'customer_name', label: 'Guest', sortable: true },
      { key: 'room_no', label: 'Room', sortable: false },
      { key: 'amount', label: 'Amount', sortable: true, render: (r) => `₹${formatAmount(r.amount)}` },
      { key: 'payment_mode', label: 'Mode', sortable: true },
      { key: 'payment_date', label: 'Date', sortable: true },
    ],
    renderCard: (r) => `
      <article class="entity-card" data-entity-id="${r.id}">
        <div class="entity-card-header">
          <div><div class="entity-card-sub">${escapeHtml(r.receipt_number)}</div>
          <div class="entity-card-title">${escapeHtml(r.customer_name)}</div>
          <div class="entity-card-sub">Room ${escapeHtml(r.room_no)}</div></div>
        </div>
        <div class="entity-card-footer">
          <span class="booking-card-amount">₹${formatAmount(r.amount)}</span>
          <span class="muted">${escapeHtml(r.payment_date)}</span>
        </div>
      </article>`,
    exportHeaders: ['Receipt', 'Guest', 'Room', 'Amount', 'Mode', 'Date'],
    exportRow: (r) => [r.receipt_number, r.customer_name, r.room_no, r.amount, r.payment_mode, r.payment_date],
    actions: billingActions,
  },

  invoices: {
    key: 'invoices',
    label: 'Invoices',
    dataSource: 'bootstrap',
    bootstrapId: 'invoicesBootstrap',
    itemsKey: 'invoices',
    formSelector: '#invoicesFilterForm',
    switcherMount: '#invoicesViewSwitcher',
    toolbarMount: '#invoicesToolbar',
    tableMount: '#invoicesTableView',
    cardMount: '#invoicesCardView',
    views: TABLE_CARD,
    defaultView: 'table',
    filterRules: { searchFields: ['invoice_id', 'customer_name', 'room_no', 'booking_id'] },
    sortKeys: {
      id: (r) => r.invoice_id || r.booking_id,
      guest: (r) => (r.customer_name || '').toLowerCase(),
      amount: (r) => Number(r.total || 0),
      date: (r) => r.bill_date || '',
      status: (r) => (r.payment_status || '').toLowerCase(),
    },
    columns: [
      { key: 'invoice_id', label: 'Invoice', sortable: true, render: (r) => `<strong>#${r.invoice_id || r.booking_id}</strong>` },
      { key: 'booking_id', label: 'Booking', sortable: false },
      { key: 'customer_name', label: 'Guest', sortable: true },
      { key: 'room_no', label: 'Room', sortable: false },
      { key: 'total', label: 'Amount', sortable: true, render: (r) => `₹${formatAmount(r.total)}` },
      { key: 'payment_status', label: 'Status', sortable: true, render: (r) => statusBadge(r.payment_status) },
      { key: 'bill_date', label: 'Date', sortable: true },
    ],
    renderCard: (r) => `
      <article class="entity-card" data-entity-id="${r.booking_id}">
        <div class="entity-card-header">
          <div><div class="entity-card-sub">Invoice #${r.invoice_id || r.booking_id}</div>
          <div class="entity-card-title">${escapeHtml(r.customer_name)}</div>
          <div class="entity-card-sub">Booking #${r.booking_id} · Room ${escapeHtml(r.room_no)}</div></div>
          ${statusBadge(r.payment_status)}
        </div>
        <div class="entity-card-footer">
          <span class="booking-card-amount">₹${formatAmount(r.total)}</span>
          <a href="/invoice/${r.booking_id}" class="btn btn-ghost btn-sm">View</a>
        </div>
      </article>`,
    actions: invoiceActions,
  },

  reports: {
    key: 'reports',
    label: 'Reports',
    dataSource: 'bootstrap',
    bootstrapId: 'reportsBootstrap',
    itemsKey: 'payments',
    formSelector: '#reportsFilterForm',
    switcherMount: '#reportsViewSwitcher',
    toolbarMount: '#reportsToolbar',
    tableMount: '#reportsTableView',
    views: [
      { id: 'charts', label: 'Chart View', short: 'Charts', icon: 'bar-chart-3' },
      { id: 'table', label: 'Table View', short: 'Table', icon: 'table' },
    ],
    defaultView: 'charts',
    chartPanels: ['#reportsCharts'],
    tablePanels: ['#reportsTablePanel'],
    filterRules: { searchFields: ['receipt_number', 'customer_name', 'room_no'] },
    sortKeys: {
      guest: (r) => (r.customer_name || '').toLowerCase(),
      amount: (r) => Number(r.amount || 0),
      date: (r) => r.payment_date || '',
    },
    columns: [
      { key: 'receipt_number', label: 'Receipt', sortable: true },
      { key: 'customer_name', label: 'Guest', sortable: true },
      { key: 'room_no', label: 'Room', sortable: false },
      { key: 'amount', label: 'Amount', sortable: true, render: (r) => `₹${formatAmount(r.amount)}` },
      { key: 'payment_mode', label: 'Mode', sortable: false },
      { key: 'payment_date', label: 'Date', sortable: true },
    ],
    exportHeaders: ['Receipt', 'Guest', 'Room', 'Amount', 'Mode', 'Date'],
    exportRow: (r) => [r.receipt_number, r.customer_name, r.room_no, r.amount, r.payment_mode, r.payment_date],
  },
};

// Legacy alias
export const ENTITY_CONFIGS = PAGE_CONFIGS;
