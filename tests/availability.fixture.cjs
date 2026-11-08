const identity = 'tixx-1001-674379';
const pageUrl = 'https://www.ticket-onlineshop.com/ols/werderbremen-hospitality/de/tageskarte/channel/shop/areaplan/venue/event/674379';
function fixture() {
  const common = { seatmapId: '674379', seatmapVersion: 7 };
  return {
    seatmap: { ...common, areas: [{ id: 0, blocks: [
      { id: 11, name: 'N1', rows: [{ id: 9, seats: [[[1001, 10, 10], [1, 2, 0]], [[2001, 30, 30]]] }] },
      { id: 12, name: 'O2', rows: [{ id: 10, seats: [[[3001, 10, 10]]] }] }
    ] }], labels: [{ id: 9, type: 'ROW', text: '20' }, { id: 10, type: 'ROW', text: '4' }] },
    mapping: { ...common, seats: [[1001, 0, 70], [1, 0, -1], [999, 1, 0], [1000, 0, 1]], generalAdmissions: [], priceCategories: [{ id: 69, name: 'Lounge' }, { id: 70, name: 'VIP' }] },
    availability: { ...common, seats: [[1001, 1], [1, 0], [999, 1], [1000, 1]], generalAdmissions: [], timestamp: 1000, expired: false }
  };
}
module.exports = { fixture, identity, pageUrl };
