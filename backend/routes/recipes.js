import { supabase } from '../config/database.js';
import authMiddleware from '../middleware/auth.js';

/**
 * Routes: /api/recipes
 *
 * GET    /api/recipes          — List all recipes (paginated) — PUBLIC
 * GET    /api/recipes/:id      — Get recipe detail with ingredients — PUBLIC
 * POST   /api/recipes          — Create recipe with ingredients (transactional) — AUTH
 * PUT    /api/recipes/:id      — Update recipe — AUTH
 * DELETE /api/recipes/:id      — Delete recipe — AUTH
 */

export default function recipesRouter(app) {

  // ─── GET /api/recipes (PUBLIC) ─────────────────────────────────────
  app.get('/api/recipes', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const category = req.query.category || '';
      const difficulty = req.query.difficulty || '';

      let query = supabase
        .from('recipes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.ilike('title', `%${search}%`);
      }
      if (category) {
        query = query.contains('tags', [category]);
      }
      if (difficulty) {
        query = query.eq('difficulty', parseInt(difficulty));
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[Recipes] List error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch recipes', details: error.message });
      }

      return res.json({
        recipes: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    } catch (err) {
      console.error('[Recipes] GET / unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── GET /api/recipes/:id (PUBLIC) ─────────────────────────────────
  app.get('/api/recipes/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

      if (recipeError) {
        if (recipeError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Recipe not found' });
        }
        console.error('[Recipes] Get error:', recipeError.message);
        return res.status(500).json({ error: 'Failed to fetch recipe', details: recipeError.message });
      }

      const { data: ingredients, error: ingError } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)
        .order('id', { ascending: true });

      if (ingError) {
        console.error('[Recipes] Ingredients error:', ingError.message);
      }

      return res.json({
        ...recipe,
        ingredients: ingredients || [],
      });
    } catch (err) {
      console.error('[Recipes] GET /:id unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── POST /api/recipes (AUTH) ──────────────────────────────────────
  app.post('/api/recipes', authMiddleware, async (req, res) => {
    try {
      const {
        title,
        description,
        steps,
        prep_time,
        cook_time,
        total_time,
        difficulty,
        portions,
        image_url,
        tags,
        category,
        ingredients,
      } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (!Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({ error: 'Steps must be a non-empty array' });
      }
      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: 'Ingredients must be a non-empty array' });
      }

      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          title: title.trim(),
          description: description || null,
          steps,
          prep_time: prep_time || null,
          cook_time: cook_time || null,
          total_time: total_time || null,
          difficulty: difficulty || null,
          portions: portions || null,
          image_url: image_url || null,
          tags: tags || [],
          category: category || null,
        })
        .select()
        .single();

      if (recipeError) {
        console.error('[Recipes] Create error:', recipeError.message);
        return res.status(500).json({ error: 'Failed to create recipe', details: recipeError.message });
      }

      const ingredientsToInsert = ingredients.map((ing) => ({
        recipe_id: recipe.id,
        name: ing.name?.trim() || '',
        quantity: ing.quantity || null,
        unit: ing.unit || null,
        optional: ing.optional || false,
      }));

      const { data: insertedIngredients, error: ingError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsToInsert)
        .select();

      if (ingError) {
        console.error('[Recipes] Ingredients insert error:', ingError.message);
        await supabase.from('recipes').delete().eq('id', recipe.id);
        return res.status(500).json({
          error: 'Failed to create recipe ingredients. Recipe rolled back.',
          details: ingError.message,
        });
      }

      return res.status(201).json({
        ...recipe,
        ingredients: insertedIngredients || [],
      });
    } catch (err) {
      console.error('[Recipes] POST / unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── PUT /api/recipes/:id (AUTH) ───────────────────────────────────
  app.put('/api/recipes/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        steps,
        prep_time,
        cook_time,
        total_time,
        difficulty,
        portions,
        image_url,
        tags,
        category,
        ingredients,
      } = req.body;

      const { data: existing, error: existError } = await supabase
        .from('recipes')
        .select('id')
        .eq('id', id)
        .single();

      if (existError || !existing) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description;
      if (steps !== undefined) updateData.steps = steps;
      if (prep_time !== undefined) updateData.prep_time = prep_time;
      if (cook_time !== undefined) updateData.cook_time = cook_time;
      if (total_time !== undefined) updateData.total_time = total_time;
      if (difficulty !== undefined) updateData.difficulty = difficulty;
      if (portions !== undefined) updateData.portions = portions;
      if (image_url !== undefined) updateData.image_url = image_url;
      if (tags !== undefined) updateData.tags = tags;
      if (category !== undefined) updateData.category = category;

      const { data: recipe, error: updateError } = await supabase
        .from('recipes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('[Recipes] Update error:', updateError.message);
        return res.status(500).json({ error: 'Failed to update recipe', details: updateError.message });
      }

      let updatedIngredients = null;
      if (Array.isArray(ingredients)) {
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);

        const ingredientsToInsert = ingredients.map((ing) => ({
          recipe_id: id,
          name: ing.name?.trim() || '',
          quantity: ing.quantity || null,
          unit: ing.unit || null,
          optional: ing.optional || false,
        }));

        const { data: newIngredients, error: ingError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsToInsert)
          .select();

        if (ingError) {
          console.error('[Recipes] Ingredients update error:', ingError.message);
        } else {
          updatedIngredients = newIngredients;
        }
      }

      if (!updatedIngredients) {
        const { data: currentIngredients } = await supabase
          .from('recipe_ingredients')
          .select('*')
          .eq('recipe_id', id)
          .order('id', { ascending: true });
        updatedIngredients = currentIngredients;
      }

      return res.json({
        ...recipe,
        ingredients: updatedIngredients || [],
      });
    } catch (err) {
      console.error('[Recipes] PUT /:id unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── DELETE /api/recipes/:id (AUTH) ────────────────────────────────
  app.delete('/api/recipes/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;

      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);

      const { error: deleteError } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('[Recipes] Delete error:', deleteError.message);
        return res.status(500).json({ error: 'Failed to delete recipe', details: deleteError.message });
      }

      return res.status(204).send();
    } catch (err) {
      console.error('[Recipes] DELETE /:id unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
