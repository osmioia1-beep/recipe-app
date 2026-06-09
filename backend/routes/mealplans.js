import { supabase } from '../config/database.js';
import authMiddleware from '../middleware/auth.js';

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

/**
 * Routes: /api/mealplans
 *
 * GET    /api/mealplans       — List weekly meal plan for authenticated user
 * POST   /api/mealplans       — Add meal to plan
 * DELETE /api/mealplans/:id   — Remove meal from plan
 */

export default function mealplansRouter(app) {

  // ─── GET /api/mealplans ─────────────────────────────────────────────
  app.get('/api/mealplans', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const weekStart = req.query.week_start || '';

      let query = supabase
        .from('meal_plans')
        .select(`
          *,
          recipe:recipes(*)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .order('meal_type', { ascending: true });

      if (weekStart) {
        const start = new Date(weekStart);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        query = query.gte('date', start.toISOString().split('T')[0]);
        query = query.lt('date', end.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MealPlans] List error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch meal plans', details: error.message });
      }

      return res.json({ meal_plans: data || [] });
    } catch (err) {
      console.error('[MealPlans] GET / unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── POST /api/mealplans ────────────────────────────────────────────
  app.post('/api/mealplans', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { recipe_id, date, meal_type } = req.body;

      if (!recipe_id) {
        return res.status(400).json({ error: 'recipe_id is required' });
      }
      if (!date) {
        return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
      }
      if (!meal_type || !VALID_MEAL_TYPES.includes(meal_type)) {
        return res.status(400).json({ error: `meal_type is required: ${VALID_MEAL_TYPES.join(' or ')}` });
      }

      // Verify recipe exists
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('id')
        .eq('id', recipe_id)
        .single();

      if (recipeError || !recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userId,
          recipe_id,
          date,
          meal_type,
        })
        .select(`
          *,
          recipe:recipes(*)
        `)
        .single();

      if (error) {
        console.error('[MealPlans] Create error:', error.message);
        return res.status(500).json({ error: 'Failed to add meal plan', details: error.message });
      }

      return res.status(201).json(data);
    } catch (err) {
      console.error('[MealPlans] POST / unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── DELETE /api/mealplans/:id ──────────────────────────────────────
  app.delete('/api/mealplans/:id', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('[MealPlans] Delete error:', error.message);
        return res.status(500).json({ error: 'Failed to delete meal plan', details: error.message });
      }

      return res.status(204).send();
    } catch (err) {
      console.error('[MealPlans] DELETE /:id unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
