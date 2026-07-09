/** Toggle chart vs table panels for reports-style pages */
export class ChartPanelView {
  constructor(chartPanels, tablePanels, store) {
    this.chartPanels = chartPanels;
    this.tablePanels = tablePanels;
    store.subscribe((snap) => this.toggle(snap.activeView));
  }

  toggle(view) {
    const showCharts = view === 'charts';
    this.chartPanels?.forEach((el) => { if (el) el.hidden = !showCharts; });
    this.tablePanels?.forEach((el) => { if (el) el.hidden = showCharts; });
  }
}
