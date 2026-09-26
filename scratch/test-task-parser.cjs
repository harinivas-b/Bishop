function extractTaskItemAndQuantity(title = "", description = "") {
  const combined = `${title} ${description}`.trim();
  
  // 1. Check patterns like "Add 50 Puff", "Restock 50 Puff", "Update 20 Samosa"
  let match = combined.match(/(?:add|restock|update|fill|make|prepare|stock)?\s*(\d+)\s+([a-zA-Z0-9\s_-]+)/i);
  if (match && match[1] && match[2]) {
    const qty = parseInt(match[1], 10);
    let itemName = match[2].trim();
    // Clean trailing words like "pcs", "items", "units" if present
    itemName = itemName.replace(/\b(pcs|pieces|items|units|kg|l|g|boxes|packs)\b/gi, "").trim();
    if (qty > 0 && itemName.length > 0) {
      return { quantity: qty, itemName };
    }
  }

  // 2. Check patterns like "Puff: 50" or "Puff 50"
  match = combined.match(/([a-zA-Z0-9\s_-]+)\s*[:=]\s*(\d+)/i);
  if (match && match[1] && match[2]) {
    const itemName = match[1].trim();
    const qty = parseInt(match[2], 10);
    if (qty > 0 && itemName.length > 0) {
      return { quantity: qty, itemName };
    }
  }

  // 3. Check fallback pattern: any number in text
  const numMatch = combined.match(/(\d+)/);
  const qty = numMatch ? parseInt(numMatch[1], 10) : 0;
  const itemName = combined.replace(/(\d+)/g, "").replace(/(add|restock|update|fill|pcs|items|task)/gi, "").trim();

  return { quantity: qty || 0, itemName: itemName || title.trim() };
}

console.log('Test "Add 50 Puff":', extractTaskItemAndQuantity("Add 50 Puff"));
console.log('Test "Restock 20 Samosa pcs":', extractTaskItemAndQuantity("Restock 20 Samosa pcs"));
console.log('Test "Puff: 50":', extractTaskItemAndQuantity("Puff: 50"));
console.log('Test "Prepare 15 Sandwich":', extractTaskItemAndQuantity("Prepare 15 Sandwich"));
