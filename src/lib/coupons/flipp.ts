/**
 * Flipp coupon + flyer fetcher.
 *
 * Flipp aggregates deals from grocery stores. Their app shows:
 *   1. All flyer items via /flipp/flyers (weekly circulars)
 *   2. Digital coupons via /flipp/coupons
 *
 * Strategy: fetch all active flyers for the postal code, then fetch every
 * item from each flyer. This mirrors what flipp.com does in "All Circulars".
 *
 * To verify/update: open https://flipp.com in Chrome DevTools →
 * Network tab (Fetch/XHR) and look for requests to backflipp.wishabi.com.
 */

import type { Coupon } from "./types";

const BASE = "https://backflipp.wishabi.com/flipp";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://flipp.com/",
};

// Blocklist: items matching any of these are never food
const NON_FOOD_KEYWORDS = [
  // Cleaning / laundry
  "detergent", "laundry", "bleach", "fabric softener", "dryer sheet",
  "stain remover", "dish soap", "dishwasher", "dish wash", "disinfect",
  "lysol", "clorox", "febreze", "air freshener", "sponge", "scrub pad",
  "mop", "broom", "vacuum",
  // Paper / plastic household
  "paper towel", "toilet paper", "tissue", "napkin", "paper plate",
  "paper cup", "trash bag", "garbage bag", "aluminum foil", "plastic wrap",
  "parchment paper", "ziploc", "zip lock",
  // Personal care
  "shampoo", "conditioner", "body wash", "hand soap", "bar soap",
  "lotion", "moisturizer", "sunscreen", "deodorant", "antiperspirant",
  "razor", "shaving", "toothbrush", "toothpaste", "mouthwash", "dental floss",
  "floss pick", "hair dye", "hair color", "hair gel", "hair spray",
  "nail polish", "makeup", "lipstick", "mascara", "foundation", "concealer",
  "perfume", "cologne",
  // Baby (non-food)
  "diaper", "baby wipe", "baby lotion", "baby shampoo",
  // Pet (non-food)
  "cat litter", "dog food", "cat food", "pet food", "dog treat", "cat treat",
  "bird seed", "fish food",
  // Medicine / health
  "vitamin", "supplement", "medicine", "bandage", "pain relief", "ibuprofen",
  "acetaminophen", "cold medicine", "cough syrup", "allergy relief",
  "thermometer", "first aid",
  // Other household / non-food
  "candle", "wax melt", "trash bag", "battery", "electronics",
  "shirt", "pant", "shoe", "sock", "underwear", "clothing",
  "toy", "book", "magazine", "greeting card", "gift card",
  "flower pot", "lawn", "garden", "fertilizer", "hardware",
  "lightbulb", "light bulb", "extension cord", "storage bin",
];

// Allowlist: if a name matches any food keyword, it's definitely food
// (overrides false positives from the blocklist)
const FOOD_KEYWORDS = [
  // Produce
  "apple", "banana", "orange", "grape", "berry", "strawberry", "blueberry",
  "raspberry", "blackberry", "cranberry", "tomato", "potato", "onion",
  "garlic", "pepper", "broccoli", "spinach", "lettuce", "carrot", "celery",
  "corn", "mushroom", "squash", "zucchini", "cucumber", "avocado", "lime",
  "lemon", "peach", "plum", "pear", "melon", "watermelon", "cantaloupe",
  "cherry", "mango", "pineapple", "kiwi", "grapefruit", "asparagus",
  "cauliflower", "cabbage", "kale", "arugula", "chard", "eggplant", "beet",
  "radish", "turnip", "sweet potato", "yam", "leek", "artichoke",
  // Meat / seafood
  "chicken", "beef", "pork", "turkey", "lamb", "veal", "bison", "venison",
  "fish", "salmon", "tuna", "tilapia", "cod", "shrimp", "crab", "lobster",
  "steak", "roast", "ground beef", "ground turkey", "sausage", "bacon",
  "ham", "hot dog", "bratwurst", "deli meat", "rotisserie", "wing", "drumstick",
  "rib", "chop", "tenderloin", "filet", "loin",
  // Dairy / eggs
  "milk", "cheese", "yogurt", "butter", "cream", "egg", "sour cream",
  "cottage cheese", "cream cheese", "whipped cream", "half and half",
  // Bakery / bread
  "bread", "roll", "bun", "muffin", "cake", "cookie", "donut", "bagel",
  "tortilla", "croissant", "biscuit", "pastry", "pie", "waffle", "pancake",
  // Frozen
  "ice cream", "frozen pizza", "frozen meal", "frozen vegetable", "frozen fruit",
  "popsicle", "gelato", "sorbet",
  // Pantry staples
  "rice", "pasta", "noodle", "soup", "sauce", "oil", "vinegar", "spice",
  "seasoning", "flour", "sugar", "salt", "cereal", "oatmeal", "granola",
  "cracker", "chip", "snack", "popcorn", "pretzel", "nut", "peanut",
  "almond", "walnut", "cashew", "pecan", "pistachio", "bean", "lentil",
  "chickpea", "canned", "condiment", "ketchup", "mustard", "mayo",
  "salad dressing", "syrup", "honey", "jam", "jelly", "peanut butter",
  "almond butter", "hummus", "salsa", "guacamole", "dip",
  // Beverages
  "coffee", "tea", "juice", "soda", "water", "drink", "beverage",
  "sports drink", "energy drink", "milk alternative", "almond milk",
  "oat milk", "soy milk",
  // Deli / prepared
  "deli", "sandwich", "wrap", "prepared meal", "rotisserie",
  // Seafood / canned
  "tuna", "sardine", "anchovy", "clam", "oyster",
  // Snacks / sweets
  "chocolate", "candy", "gummy", "licorice", "marshmallow", "caramel",
  "trail mix", "dried fruit", "raisin",
];

function isFoodItem(name: string): boolean {
  const lower = name.toLowerCase();
  // Allowlist overrides blocklist
  if (FOOD_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  return !NON_FOOD_KEYWORDS.some((kw) => lower.includes(kw));
}

// Keywords that identify grocery / food stores (case-insensitive)
const GROCERY_KEYWORDS = [
  "grocery", "supermarket", "market", "food", "farm", "kroger", "aldi",
  "walmart", "heb", "h-e-b", "costco", "target", "safeway", "publix",
  "whole foods", "trader joe", "sprouts", "meijer", "wegman", "giant",
  "stop & shop", "king soopers", "smith", "fry's", "ralphs", "vons",
  "jewel", "shaw", "hannaford", "winn", "piggly", "hy-vee", "brookshire",
  "fiesta", "randall", "sams club", "sam's", "bj's", "lidl", "save",
];

function isGroceryStore(name: string): boolean {
  const lower = name.toLowerCase();
  return GROCERY_KEYWORDS.some((kw) => lower.includes(kw));
}

function parseItem(i: Record<string, unknown>, fallbackMerchant = ""): Coupon | null {
  const merchant = ((i.merchant_name ?? i.store_name ?? fallbackMerchant) as string).trim();
  if (!merchant || !isGroceryStore(merchant)) return null;

  const name = (i.name ?? i.description) as string | undefined;
  if (!name || !isFoodItem(name)) return null;

  const salePrice = (i.current_price ?? i.sale_price ?? i.price) as number | undefined;
  const regular = (i.pre_price ?? i.original_price ?? i.regular_price) as number | undefined;

  return {
    store: merchant,
    itemId: i.id as number | undefined,
    item: name,
    regularPrice: regular,
    couponPrice: salePrice,
    savings: regular != null && salePrice != null ? Math.max(0, regular - salePrice) : undefined,
    expires: (i.valid_to ?? i.expiry_date) as string | undefined,
    imageUrl: ((i.cutout_image_url ?? i.clean_image_url ?? i.image_url) as string | undefined) || undefined,
    storeAddress: (i.store_address ?? i.merchant_address ?? i.address) as string | undefined || undefined,
    storeName: (i.flyer_merchant_name ?? merchant) as string,
  };
}

/** Fetch all items from a specific flyer */
async function fetchFlyerItems(flyerId: number, merchantName: string): Promise<Coupon[]> {
  try {
    const res = await fetch(`${BASE}/flyers/${flyerId}?locale=en-us`, { headers: HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const items: unknown[] = data?.items ?? [];
    return items.flatMap((item) => {
      const i = item as Record<string, unknown>;
      const name = (i.name ?? i.short_name) as string | undefined;
      if (!name || !isFoodItem(name)) return [];
      // price is a string like "9.97" or empty
      const priceStr = i.price as string | undefined;
      const salePrice = priceStr ? parseFloat(priceStr) || undefined : undefined;
      const coupon: Coupon = {
        store: merchantName,
        itemId: i.id as number | undefined,
        item: name,
        couponPrice: salePrice,
        expires: i.valid_to as string | undefined,
        imageUrl: (i.cutout_image_url as string | undefined) || undefined,
        storeName: merchantName,
      };
      return [coupon];
    });
  } catch {
    return [];
  }
}

/** Fetch all active flyers for a postal code */
async function fetchFlyers(postalCode: string): Promise<Array<{ id: number; merchant_name: string }>> {
  const params = new URLSearchParams({ locale: "en-us", postal_code: postalCode });
  try {
    const res = await fetch(`${BASE}/flyers?${params}`, { headers: HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const flyers: unknown[] = Array.isArray(data) ? data : data?.flyers ?? [];
    return flyers
      .map((f) => f as Record<string, unknown>)
      .filter((f) => f.id && isGroceryStore((f.merchant ?? f.merchant_name ?? "") as string))
      .map((f) => ({ id: f.id as number, merchant_name: (f.merchant ?? f.merchant_name ?? "") as string }));
  } catch {
    return [];
  }
}

/** Fallback: search endpoint for when flyers API doesn't return enough */
async function searchItems(postalCode: string, q: string): Promise<Coupon[]> {
  const params = new URLSearchParams({ locale: "en-us", postal_code: postalCode, q });
  try {
    const res = await fetch(`${BASE}/items/search?${params}`, { headers: HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const items: unknown[] = Array.isArray(data) ? data : data?.items ?? [];
    return items.flatMap((item) => {
      const parsed = parseItem(item as Record<string, unknown>);
      return parsed ? [parsed] : [];
    });
  } catch {
    return [];
  }
}

export async function fetchFlippCoupons(
  postalCode: string,
  query = ""
): Promise<Coupon[]> {
  // If a specific search query is provided, just search
  if (query) return searchItems(postalCode, query);

  // Otherwise: fetch all grocery flyers and pull every item from each
  const flyers = await fetchFlyers(postalCode);

  let allCoupons: Coupon[] = [];

  if (flyers.length > 0) {
    const flyerResults = await Promise.all(
      flyers.map((f) => fetchFlyerItems(f.id, f.merchant_name))
    );
    allCoupons = flyerResults.flat();
  }

  // Always also run a broad search as fallback/supplement
  const searchResults = await Promise.all(
    ["meat", "produce", "dairy", "bakery", "frozen"].map((q) => searchItems(postalCode, q))
  );
  allCoupons.push(...searchResults.flat());

  // Deduplicate by store+item
  const seen = new Set<string>();
  const deduped: Coupon[] = [];
  for (const c of allCoupons) {
    const key = `${c.store}|${c.item}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(c);
    }
  }
  return deduped;
}
