export const allergenCatalog = [
  { token: "peanuts", label: "Peanuts" },
  { token: "tree_nuts", label: "Tree Nuts" },
  { token: "sesame", label: "Sesame" },
  { token: "shellfish", label: "Shellfish" },
  { token: "milk", label: "Milk / Dairy" },
  { token: "egg", label: "Egg" },
  { token: "soy", label: "Soy" },
  { token: "wheat", label: "Wheat / Gluten" },
  { token: "italian_sausage", label: "Italian Sausage (Pork/Spices)" },
  { token: "fish", label: "Fish" }
];

export const dishes = [
  { id:"thai_pad_thai_peanut", name:"Peanut Pad Thai", cuisine:"Thai", ingredients:["rice noodles","peanuts","egg","soy sauce","tamarind","shrimp","scallions","lime"] },
  { id:"italian_margherita_pizza", name:"Margherita Pizza", cuisine:"Italian", ingredients:["wheat dough","tomato","mozzarella","basil","olive oil"] },
  { id:"italian_sausage_penne", name:"Italian Sausage Penne", cuisine:"Italian", ingredients:["wheat penne","italian sausage","tomato sauce","parmesan","garlic"] },
  { id:"middle_east_falafel_wrap", name:"Falafel Wrap", cuisine:"Middle Eastern", ingredients:["chickpeas","tahini","sesame","pita bread","lettuce","tomato","cucumber"] },
  { id:"japanese_california_roll", name:"California Roll", cuisine:"Japanese", ingredients:["sushi rice","nori","imitation crab","mayonnaise","avocado","sesame"] },
  { id:"indian_tikka_masala", name:"Chicken Tikka Masala", cuisine:"Indian", ingredients:["chicken","yogurt","cream","spices","tomato","butter"] },
  { id:"american_pbj", name:"PB&J Sandwich", cuisine:"American", ingredients:["peanut butter","jelly","wheat bread"] },
  { id:"mexican_shrimp_tacos", name:"Shrimp Tacos", cuisine:"Mexican", ingredients:["shrimp","cabbage","crema","corn tortillas","lime"] },
  { id:"chinese_egg_fried_rice", name:"Egg Fried Rice", cuisine:"Chinese", ingredients:["rice","egg","soy sauce","peas","carrot","scallions","sesame oil"] },
  { id:"japanese_katsu_curry", name:"Chicken Katsu Curry", cuisine:"Japanese", ingredients:["chicken cutlet","wheat panko","curry sauce","rice","egg"] },
  { id:"med_pesto_pasta", name:"Pesto Pasta", cuisine:"Italian", ingredients:["wheat pasta","basil","pine nuts","parmesan","olive oil","garlic"] },
  { id:"greek_gyro_wrap", name:"Lamb Gyro Wrap", cuisine:"Mediterranean", ingredients:["pita bread","lamb","tzatziki","yogurt","tomato","onion"] },
  { id:"american_clam_chowder", name:"Clam Chowder", cuisine:"American", ingredients:["clams","cream","butter","wheat flour","potato","celery","onion"] },
  { id:"thai_green_curry", name:"Green Curry", cuisine:"Thai", ingredients:["coconut milk","chicken","fish sauce","eggplant","basil","green curry paste"] }
];

const normalizationRules = [
  { pattern:/\bpeanut(s)?\b/i, token:"peanuts" },
  { pattern:/\bpine nut(s)?\b/i, token:"tree_nuts" },
  { pattern:/\bwalnut(s)?|almond(s)?|cashew(s)?|pistachio(s)?|hazelnut(s)?/i, token:"tree_nuts" },
  { pattern:/\bsesame\b|tahini/i, token:"sesame" },
  { pattern:/\bshrimp|prawn|crab|lobster|clam(s)?|mussel(s)?|oyster(s)?\b/i, token:"shellfish" },
  { pattern:/\bmoz(zarella)?|parmesan|parmigiano|yogurt|cream|butter|milk|cheese|tzatziki|crema\b/i, token:"milk" },
  { pattern:/\begg(s)?\b/i, token:"egg" },
  { pattern:/\bsoy\b|soy sauce/i, token:"soy" },
  { pattern:/\bwheat\b|flour|bread|panko|pasta|dough\b/i, token:"wheat" },
  { pattern:/\bnori|salmon|tuna|cod|fish sauce|fish\b/i, token:"fish" },
  { pattern:/italian sausage/i, token:"italian_sausage" }
];

export function normalizeIngredientToAllergens(ingredient) {
  const found = new Set();
  for (const rule of normalizationRules) {
    if (rule.pattern.test(ingredient)) found.add(rule.token);
  }
  return found;
}

export function allergensForDish(dish) {
  const tokens = new Set();
  for (const ingredient of dish.ingredients) {
    const mapped = normalizeIngredientToAllergens(ingredient);
    for (const token of mapped) tokens.add(token);
  }
  return tokens;
}
