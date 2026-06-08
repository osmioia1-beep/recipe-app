import { supabase } from '../config/database.js';

import authMiddleware from '../middleware/auth.js';

/**
 * Routes: /api/pantry
 *
 * GET    /api/pantry       — List pantry items for authenticated user
 * POST   /api/pantry       — Add item to pantry
 * PUT    /api/pantry/:id   — Update pantry item
 * DELETE /api/pantry/:id   — Remove pantry item
 */

export default function pantryRouter(app) {

  // ─── GET /api/pantry ────────────────────────────────────────────────
  app.get('/api/pantry', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;

      const category = req.query.category || '';
      const expiring = req.query.expiring || ''; // 'true' to filter expiring soon
      const search = req.query.search || '';

      let query = supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', userId)
        .order('expiry_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      if (expiring === 'true') {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        query = query.lte('expiry_date', sevenDaysFromNow.toISOString().split('T')[0]);
        query = query.gte('expiry_date', new Date().toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Pantry] List error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch pantry items', details: error.message });
      }

      return res.json({ items: data || [] });
    } catch (err) {
      console.error('[Pantry] GET / unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── POST /api/pantry ───────────────────────────────────────────────
  app.post('/api/pantry', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;

      const { name, quantity, unit, category, expiry_date, notes } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const { data, error } = await supabase
        .from('pantry_items')
        .insert({
          user_id: userId,
          name: name.trim(),
          quantity: quantity || null,
          unit: unit || null,
          category: category || null,
          expiry_date: expiry_date || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[Pantry] Create error:', error.message);
        return res.status(500).json({ error: 'Failed to add pantry item', details: error.message });
      }

      return res.status(201).json(data);
    } catch (err) {
      console.error('[Pantry] POST / unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── PUT /api/pantry/:id ────────────────────────────────────────────
  app.put('/api/pantry/:id', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;

      const { id } = req.params;
      const { name, quantity, unit, category, expiry_date, notes } = req.body;

      // Check ownership
      const { data: existing, error: existError } = await supabase
        .from('pantry_items')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (existError || !existing) {
        return res.status(404).json({ error: 'Pantry item not found' });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (quantity !== undefined) updateData.quantity = quantity;
      if (unit !== undefined) updateData.unit = unit;
      if (category !== undefined) updateData.category = category;
      if (expiry_date !== undefined) updateData.expiry_date = expiry_date;
      if (notes !== undefined) updateData.notes = notes;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('pantry_items')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[Pantry] Update error:', error.message);
        return res.status(500).json({ error: 'Failed to update pantry item', details: error.message });
      }

      return res.json(data);
    } catch (err) {
      console.error('[Pantry] PUT /:id unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── DELETE /api/pantry/:id ─────────────────────────────────────────
  app.delete('/api/pantry/:id', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;

      const { id } = req.params;

      const { error } = await supabase
        .from('pantry_items')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('[Pantry] Delete error:', error.message);
        return res.status(500).json({ error: 'Failed to delete pantry item', details: error.message });
      }

      return res.status(204).send();
    } catch (err) {
      console.error('[Pantry] DELETE /:id unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
