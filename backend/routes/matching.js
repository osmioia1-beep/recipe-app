import { supabase } from '../config/database.js';

import authMiddleware from '../middleware/auth.js';

/**
 * Routes: /api/matching
 *
 * GET /api/matching — Ingredient Matching Engine
 *
 * Compares pantry items with recipe ingredients and returns:
 *   - can_make:    recipes where ALL (non-optional) ingredients are in the pantry
 *   - almost:      recipes where 1-2 (non-optional) ingredients are missing
 *
 * Sorting priority:
 *   1. Number of pantry ingredients expiring soon (ascending — more urgent first)
 *   2. Number of missing ingredients (ascending)
 *   3. Recipe title (alphabetical)
 *
 * Query params:
 *   - upcoming_days (default: 7) — how many days to consider "expiring soon"
 *   - limit (default: 50)
 */

export default function matchingRouter(app) {

  // ─── GET /api/matching ──────────────────────────────────────────────
  app.get('/api/matching', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;

      const upcomingDays = parseInt(req.query.upcoming_days) || 7;
      const limit = parseInt(req.query.limit) || 50;

      // 1. Fetch all pantry items for the user
      const { data: pantryItems, error: pantryError } = await supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', userId);

      if (pantryError) {
        console.error('[Matching] Pantry fetch error:', pantryError.message);
        return res.status(500).json({ error: 'Failed to fetch pantry items', details: pantryError.message });
      }

      if (!pantryItems || pantryItems.length === 0) {
        return res.json({
          can_make: [],
          almost: [],
          message: 'Your pantry is empty. Add items to see matching recipes!',
        });
      }

      // Build normalized pantry map (lowercase name → item)
      const pantryMap = new Map();
      const expiringNames = new Set();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cutoffDate = new Date(today);
      cutoffDate.setDate(cutoffDate.getDate() + upcomingDays);

      for (const item of pantryItems) {
        const key = item.name.toLowerCase().trim();
        pantryMap.set(key, item);

        if (item.expiry_date) {
          const expDate = new Date(item.expiry_date);
          if (expDate <= cutoffDate && expDate >= today) {
            expiringNames.add(key);
          }
        }
      }

      const pantryNames = new Set(pantryMap.keys());

      // 2. Fetch all recipes with their ingredients
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients:recipe_ingredients(*)
        `)
        .limit(500); // reasonable cap

      if (recipesError) {
        console.error('[Matching] Recipes fetch error:', recipesError.message);
        return res.status(500).json({ error: 'Failed to fetch recipes', details: recipesError.message });
      }

      if (!recipes || recipes.length === 0) {
        return res.json({
          can_make: [],
          almost: [],
          message: 'No recipes found in the database.',
        });
      }

      // 3. Match engine
      const canMake = [];
      const almost = [];

      for (const recipe of recipes) {
        const ingredients = recipe.ingredients || [];

        if (ingredients.length === 0) continue;

        const missing = [];
        let expiringIngredientCount = 0;

        for (const ing of ingredients) {
          const ingName = ing.name.toLowerCase().trim();
          const inPantry = pantryNames.has(ingName);

          if (inPantry) {
            // Count how many matching pantry items are expiring soon
            if (expiringNames.has(ingName)) {
              expiringIngredientCount++;
            }
          } else if (!ing.optional) {
            missing.push({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
            });
          }
        }

        const matchResult = {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          image_url: recipe.image_url,
          difficulty: recipe.difficulty,
          total_time: recipe.total_time,
          prep_time: recipe.prep_time,
          cook_time: recipe.cook_time,
          portions: recipe.portions,
          tags: recipe.tags,
          category: recipe.category,
          total_ingredients: ingredients.length,
          matched_ingredients: ingredients.length - missing.length,
          match_percentage: Math.round(((ingredients.length - missing.length) / ingredients.length) * 100),
          expiring_ingredients_used: expiringIngredientCount,
          missing_ingredients: missing,
        };

        if (missing.length === 0) {
          canMake.push(matchResult);
        } else if (missing.length <= 2) {
          almost.push(matchResult);
        }
      }

      // 4. Sort: by expiring ingredients desc (more urgent first), then missing asc, then title
      const sortFn = (a, b) => {
        // More expiring ingredients used → higher priority (descending)
        const expiringDiff = b.expiring_ingredients_used - a.expiring_ingredients_used;
        if (expiringDiff !== 0) return expiringDiff;

        // Fewer missing ingredients → higher priority (ascending)
        const missingDiff = a.missing_ingredients.length - b.missing_ingredients.length;
        if (missingDiff !== 0) return missingDiff;

        // Alphabetical by title
        return a.title.localeCompare(b.title);
      };

      canMake.sort(sortFn);
      almost.sort(sortFn);

      return res.json({
        can_make: canMake.slice(0, limit),
        almost: almost.slice(0, limit),
        stats: {
          pantry_items: pantryItems.length,
          recipes_analyzed: recipes.length,
          can_make_count: canMake.length,
          almost_count: almost.length,
          expiring_soon_count: expiringNames.size,
          upcoming_days: upcomingDays,
        },
      });
    } catch (err) {
      console.error('[Matching] GET / unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
