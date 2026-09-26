const { getItemEmoji, hasEmoji } = require("../src/lib/utils");

const testCases = [
  { input: "Special Tea", expected: "☕" },
  { input: "Filter Coffee", expected: "☕" },
  { input: "Masala Dosa", expected: "🥞" },
  { input: "Ghee Roast Dosai", expected: "🥞" },
  { input: "Plain Idli", expected: "🍚" },
  { input: "Medu Vada", expected: "🍩" },
  { input: "Mini Samosa", expected: "🥟" },
  { input: "Kerala Parotta", expected: "🫓" },
  { input: "Butter Chapati", expected: "🫓" },
  { input: "Chicken Biriyani", expected: "🍛" },
  { input: "South Indian Rice Meals", expected: "🍚" },
  { input: "Ven Pongal", expected: "🍚" },
  { input: "Poori Masala", expected: "🫓" },
  { input: "Mango Juice", expected: "🧃" },
  { input: "Chocolate Cake", expected: "🍰" },
  { input: "Vanilla Ice Cream", expected: "🍦" },
  { input: "Soft Drink (Cold)", expected: "🥤" },
  { input: "Mineral Water", expected: "💧" },
  { input: "☕ Existing Coffee", expected: "" }, // Test duplicate emoji prevention
];

console.log("=== BISHOP FOOD EMOJI MAPPER TEST ===");
let passed = 0;

testCases.forEach(({ input, expected }) => {
  const result = getItemEmoji(input);
  const ok = result === expected;
  if (ok) passed++;
  console.log(
    `[${ok ? "PASS" : "FAIL"}] "${input}" => "${result}" (Expected: "${expected}")`
  );
});

console.log(`\nResult: ${passed}/${testCases.length} tests passed.`);
