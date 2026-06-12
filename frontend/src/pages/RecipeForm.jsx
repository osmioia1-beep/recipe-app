import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import supabase from '../supabase'
import './RecipeForm.css'

const CATEGORIES = ['Pratos Principais', 'Sobremesas', 'Sopas', 'Saladas', 'Pequeno-Almoço', 'Lanches', 'Outra']
const SUGGESTED_TAGS = ['portuguesas', 'italiana', 'francesa', 'saudável', 'vegetariana', 'vegan', 'rápido', 'forno', 'grelhado', 'sopas', 'massa', 'arroz', 'peixe', 'carne', 'frango', 'sobremesas', 'bolos', 'doces', 'street food', 'tradicional']
const UNITS = ['g', 'kg', 'ml', 'L', 'chávena', 'colher de sopa', 'colher de chá', 'unidade', 'dentes', 'fatias', 'pitada', 'q.b.']

export default function RecipeForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState({
    title: '',
    description: '',
    prep_time: '',
    cook_time: '',
    total_time: '',
    difficulty: 2,
    portions: 4,
    category: 'Outra',
    image_url: '',
    tags: [],
  })
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: '', optional: false }])
  const [steps, setSteps] = useState([''])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [showUnitDropdown, setShowUnitDropdown] = useState(null)

  useEffect(() => {
    if (isEdit) loadRecipe()
  }, [id])

  async function loadRecipe() {
    setLoading(true)
    try {
      const { data: recipe, error: rErr } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()
      if (rErr) throw rErr

      setForm({
        title: recipe.title || '',
        description: recipe.description || '',
        prep_time: recipe.prep_time || '',
        cook_time: recipe.cook_time || '',
        total_time: recipe.total_time || '',
        difficulty: recipe.difficulty || 2,
        portions: recipe.portions || 4,
        category: recipe.category || 'Outra',
        image_url: recipe.image_url || '',
        tags: recipe.tags || [],
      })

      const { data: ingData, error: iErr } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)
        .order('id')
      if (!iErr && ingData && ingData.length > 0) {
        setIngredients(ingData.map(i => ({
          name: i.name || '',
          quantity: i.quantity || '',
          unit: i.unit || '',
          optional: i.optional || false,
        })))
      }

      if (recipe.steps && recipe.steps.length > 0) {
        setSteps(recipe.steps)
      }
    } catch (err) {
      console.error('Failed to load recipe:', err)
      setError('Erro ao carregar receita.')
    }
    setLoading(false)
  }

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleTag(tag) {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  function addCustomTag() {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }))
    }
    setTagInput('')
  }

  function addIngredient() {
    setIngredients(prev => [...prev, { name: '', quantity: '', unit: '', optional: false }])
  }

  function removeIngredient(index) {
    setIngredients(prev => prev.filter((_, i) => i !== index))
  }

  function updateIngredient(index, field, value) {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))
  }

  function addStep() {
    setSteps(prev => [...prev, ''])
  }

  function removeStep(index) {
    setSteps(prev => prev.filter((_, i) => i !== index))
  }

  function updateStep(index, value) {
    setSteps(prev => prev.map((s, i) => i === index ? value : s))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!form.title.trim()) {
      setError('O título é obrigatório.')
      setSaving(false)
      return
    }

    const validIngredients = ingredients.filter(i => i.name.trim())
    const validSteps = steps.filter(s => s.trim())

    if (validIngredients.length === 0) {
      setError('Adiciona pelo menos um ingrediente.')
      setSaving(false)
      return
    }

    if (validSteps.length === 0) {
      setError('Adiciona pelo menos um passo.')
      setSaving(false)
      return
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      prep_time: form.prep_time ? parseInt(form.prep_time) : null,
      cook_time: form.cook_time ? parseInt(form.cook_time) : null,
      total_time: form.total_time ? parseInt(form.total_time) : null,
      difficulty: parseInt(form.difficulty) || 2,
      portions: parseInt(form.portions) || 4,
      category: form.category || null,
      image_url: form.image_url.trim() || null,
      tags: form.tags,
      steps: validSteps,
      ingredients: validIngredients.map(i => ({
        name: i.name.trim(),
        quantity: i.quantity.trim() || null,
        unit: i.unit.trim() || null,
        optional: i.optional || false,
      })),
    }

    try {
      if (isEdit) {
        const { error: uErr } = await supabase
          .from('recipes')
          .update({
            title: payload.title,
            description: payload.description,
            prep_time: payload.prep_time,
            cook_time: payload.cook_time,
            total_time: payload.total_time,
            difficulty: payload.difficulty,
            portions: payload.portions,
            category: payload.category,
            image_url: payload.image_url,
            tags: payload.tags,
            steps: payload.steps,
          })
          .eq('id', id)
        if (uErr) throw uErr

        await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
        const ingPayload = payload.ingredients.map(i => ({
          recipe_id: id,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          optional: i.optional,
        }))
        const { error: ingErr } = await supabase.from('recipe_ingredients').insert(ingPayload)
        if (ingErr) throw ingErr
      } else {
        const { data: newRecipe, error: cErr } = await supabase
          .from('recipes')
          .insert({
            title: payload.title,
            description: payload.description,
            prep_time: payload.prep_time,
            cook_time: payload.cook_time,
            total_time: payload.total_time,
            difficulty: payload.difficulty,
            portions: payload.portions,
            category: payload.category,
            image_url: payload.image_url,
            tags: payload.tags,
            steps: payload.steps,
          })
          .select()
          .single()
        if (cErr) throw cErr

        const ingPayload = payload.ingredients.map(i => ({
          recipe_id: newRecipe.id,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          optional: i.optional,
        }))
        await supabase.from('recipe_ingredients').insert(ingPayload)
      }

      navigate(isEdit ? `/recipes/${id}` : '/recipes')
    } catch (err) {
      console.error('Failed to save recipe:', err)
      setError('Erro ao guardar. Tenta novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="page"><div className="home-loading">A carregar receita...</div></div>
  }

  return (
    <div className="page recipe-form-page">
      <form onSubmit={handleSubmit} className="recipe-form">
        {error && <div className="form-error">{error}</div>}

        {/* ─── TÍTULO ─── */}
        <div className="form-group">
          <label className="form-label">Título *</label>
          <input
            type="text"
            className="form-control form-control-lg"
            value={form.title}
            onChange={e => updateForm('title', e.target.value)}
            placeholder="Ex: Bolo de Chocolate"
          />
        </div>

        {/* ─── DESCRIÇÃO ─── */}
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <textarea
            className="form-control"
            value={form.description}
            onChange={e => updateForm('description', e.target.value)}
            placeholder="Breve descrição da receita..."
            rows={3}
          />
        </div>

        {/* ─── TEMPO + PORÇÕES ─── */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">⏱ Prep (min)</label>
            <input
              type="number"
              className="form-control"
              value={form.prep_time}
              onChange={e => updateForm('prep_time', e.target.value)}
              placeholder="15"
              min="0"
            />
          </div>
          <div className="form-group">
            <label className="form-label">🔥 Cozedura (min)</label>
            <input
              type="number"
              className="form-control"
              value={form.cook_time}
              onChange={e => updateForm('cook_time', e.target.value)}
              placeholder="30"
              min="0"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">👥 Porções</label>
            <input
              type="number"
              className="form-control"
              value={form.portions}
              onChange={e => updateForm('portions', e.target.value)}
              min="1"
            />
          </div>
          <div className="form-group">
            <label className="form-label">📂 Categoria</label>
            <select
              className="form-control"
              value={form.category}
              onChange={e => updateForm('category', e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── DIFICULDADE ─── */}
        <div className="form-group">
          <label className="form-label">Dificuldade</label>
          <div className="difficulty-selector">
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                type="button"
                className={`difficulty-btn ${form.difficulty >= level ? 'active' : ''}`}
                onClick={() => updateForm('difficulty', level)}
              >
                ★
              </button>
            ))}
            <span className="difficulty-label">
              {form.difficulty <= 1 ? 'Fácil' : form.difficulty <= 2 ? 'Médio' : form.difficulty <= 3 ? 'Avançado' : form.difficulty <= 4 ? 'Difícil' : 'Expert'}
            </span>
          </div>
        </div>

        {/* ─── TAGS ─── */}
        <div className="form-group">
          <label className="form-label">Tags</label>
          <div className="tags-input-wrap">
            <div className="chip-group">
              {SUGGESTED_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`chip ${form.tags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="tag-add-row">
              <input
                type="text"
                className="form-control tag-input"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
                placeholder="Tag personalizada..."
              />
              <button type="button" className="btn btn-sm btn-secondary" onClick={addCustomTag}>+</button>
            </div>
            {form.tags.length > 0 && (
              <div className="selected-tags">
                {form.tags.map(tag => (
                  <span key={tag} className="chip chip-selected active" onClick={() => toggleTag(tag)}>
                    {tag} ✕
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── INGREDIENTES ─── */}
        <div className="form-section">
          <div className="form-section-header">
            <h3>🧄 Ingredientes ({ingredients.length})</h3>
            <button type="button" className="btn btn-sm btn-primary" onClick={addIngredient}>+ Adicionar</button>
          </div>
          <div className="ingredients-list">
            {ingredients.map((ing, i) => (
              <div key={i} className="ingredient-card">
                <div className="ingredient-card-top">
                  <span className="ingredient-number">{i + 1}</span>
                  {ingredients.length > 1 && (
                    <button type="button" className="btn-icon btn-icon-danger" onClick={() => removeIngredient(i)}>✕</button>
                  )}
                </div>
                <div className="ingredient-card-body">
                  <input
                    type="text"
                    className="form-control ingredient-name-input"
                    value={ing.name}
                    onChange={e => updateIngredient(i, 'name', e.target.value)}
                    placeholder="Nome do ingrediente *"
                    autoFocus={i === ingredients.length - 1 && !ing.name}
                  />
                  <div className="ingredient-row">
                    <input
                      type="text"
                      className="form-control"
                      value={ing.quantity}
                      onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                      placeholder="Qtd."
                    />
                    <div className="unit-dropdown-wrap">
                      <input
                        type="text"
                        className="form-control"
                        value={ing.unit}
                        onChange={e => updateIngredient(i, 'unit', e.target.value)}
                        placeholder="Un."
                        onFocus={() => setShowUnitDropdown(i)}
                        onBlur={() => setTimeout(() => setShowUnitDropdown(null), 200)}
                      />
                      {showUnitDropdown === i && (
                        <div className="unit-dropdown">
                          {UNITS.map(u => (
                            <button
                              key={u}
                              type="button"
                              className="unit-option"
                              onMouseDown={() => updateIngredient(i, 'unit', u)}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <label className="ingredient-optional">
                    <input
                      type="checkbox"
                      checked={ing.optional}
                      onChange={e => updateIngredient(i, 'optional', e.target.checked)}
                    />
                    <span>Opcional</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── PREPARAÇÃO ─── */}
        <div className="form-section">
          <div className="form-section-header">
            <h3>📋 Preparação ({steps.length})</h3>
            <button type="button" className="btn btn-sm btn-primary" onClick={addStep}>+ Adicionar</button>
          </div>
          <div className="steps-list">
            {steps.map((step, i) => (
              <div key={i} className="step-card">
                <div className="step-card-top">
                  <span className="step-number">{i + 1}</span>
                  {steps.length > 1 && (
                    <button type="button" className="btn-icon btn-icon-danger" onClick={() => removeStep(i)}>✕</button>
                  )}
                </div>
                <textarea
                  className="form-control"
                  value={step}
                  onChange={e => updateStep(i, e.target.value)}
                  placeholder={`Passo ${i + 1} — descreve o que fazer...`}
                  rows={3}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ─── BOTÕES ─── */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'A guardar...' : (isEdit ? 'Guardar' : 'Criar receita')}
          </button>
        </div>
      </form>
    </div>
  )
}
