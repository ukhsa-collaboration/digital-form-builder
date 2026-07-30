export function createCards(details, cards: Record<string, string[]>) {
  let transformed: any[] = [];

  const itemsMap = new Map<string, any>();
  for (const detail of details) {
    for (const item of detail.items) {
      itemsMap.set(item.name, item);
    }
  }
  for (const cardTitle in cards) {
    const items: any[] = [];
    for (const field of cards[cardTitle]) {
      const item = itemsMap.get(field);
      if (item) {
        items.push(item);
        console.log("item added", item);
      }
    }
    if (items.length !== 0) {
      transformed.push({
        cardTitle: cardTitle,
        items: items,
      });
    }
  }
  return transformed;
}
