import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './RecipeForm.css'

const CATEGORIES = ['Italiana', 'Carnes', 'Saladas', 'Peixe', 'Mexicana', 'Sopas', 'Sobremesas', 'Vegetariana', 'Outra']
const DIFFICULTIES = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Médio' },
  { value: 'hard', label: 'Difícil' },
]

export default function RecipeForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState({
    title: '',
    description: '',
    prep_time: '',
    difficulty: 'easy',
    servings: 4,
    category: 'Outra',
    image_url: '',
  })
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '' }])
  const [steps, setSteps] = useState([''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit) loadRecipe()
  }, [id])

  async function loadRecipe() {
    // In production: fetch from Supabase
    // For now, populate with demo data
    setForm({
      title: 'Pasta Carbonara',
      description: 'A autêntica carbonara italiana',
      prep_time: 20,
      difficulty: 'medium',
      servings: 4,
      category: 'Italiana',
      image_url: '',
    })
    setIngredients([
      { name: 'Spaghetti', quantity: '400g' },
      { name: 'Bacon', quantity: '200g' },
      { name: 'Gemas de ovo', quantity: '4' },
    ])
    setSteps([
      'Cozer a massa em água salgada.',
      'Fritar o bacon.',
      'Misturar tudo e servir.',
    ])
  }

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addIngredient() {
    setIngredients(prev => [...prev, { name: '', quantity: '' }])
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
      ...form,
      prep_time: parseInt(form.prep_time) || 0,
      servings: parseInt(form.servings) || 1,
      ingredients: validIngredients,
      steps: validSteps,
    }

    try {
      // In production:
      // if (isEdit) await supabase.from('recipes').update(payload).eq('id', id)
      // else await supabase.from('recipes').insert(payload)
      console.log('Saving recipe:', payload)
      await new Promise(r => setTimeout(r, 500)) // simulate save
      navigate(isEdit ? `/recipes/${id}` : '/recipes')
    } catch (err) {
      setError('Erro ao guardar. Tenta novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{isEdit ? 'Editar Receita' : 'Nova Receita'}</h1>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-group">
          <label>Título *</label>
          <input
            type="text"
            className="form-control"
            value={form.title}
            onChange={e => updateForm('title', e.target.value)}
            placeholder="Ex: Bolo de Chocolate"
          />
        </div>

        <div className="form-group">
          <label>Descrição</label>
          <textarea
            className="form-control"
            value={form.description}
            onChange={e => updateForm('description', e.target.value)}
            placeholder="Breve descrição da receita..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Tempo (min)</label>
            <input
              type="number"
              className="form-control"
              value={form.prep_time}
              onChange={e => updateForm('prep_time', e.target.value)}
              placeholder="30"
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Porções</label>
            <input
              type="number"
              className="form-control"
              value={form.servings}
              onChange={e => updateForm('servings', e.target.value)}
              min="1"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Dificuldade</label>
            <select
              className="form-control"
              value={form.difficulty}
              onChange={e => updateForm('difficulty', e.target.value)}
            >
              {DIFFICULTIES.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Categoria</label>
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

        <div className="form-group">
          <label>URL da foto</label>
          <input
            type="url"
            className="form-control"
            value={form.image_url}
            onChange={e => updateForm('image_url', e.target.value)}
            placeholder="https://..."
          />
        </div>

        {/* Ingredients */}
        <div className="form-section">
          <div className="form-section-header">
            <h3>Ingredientes</h3>
            <button type="button" className="btn btn-sm btn-secondary" onClick={addIngredient}>+ Adicionar</button>
          </div>
          {ingredients.map((ing, i) => (
            <div key={i} className="form-list-row">
              <input
                type="text"
                className="form-control"
                value={ing.quantity}
                onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                placeholder="Qtd."
                style={{ flex: '0 0 100px' }}
              />
              <input
                type="text"
                className="form-control"
                value={ing.name}
                onChange={e => updateIngredient(i, 'name', e.target.value)}
                placeholder="Ingrediente"
              />
              {ingredients.length > 1 && (
                <button type="button" className="btn-icon" onClick={() => removeIngredient(i)}>✕</button>
              )}
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="form-section">
          <div className="form-section-header">
            <h3>Preparação</h3>
            <button type="button" className="btn btn-sm btn-secondary" onClick={addStep}>+ Adicionar</button>
          </div>
          {steps.map((step, i) => (
            <div key={i} className="form-list-row">
              <span className="form-step-num">{i + 1}</span>
              <textarea
                className="form-control"
                value={step}
                onChange={e => updateStep(i, e.target.value)}
                placeholder={`Passo ${i + 1}`}
                rows={2}
              />
              {steps.length > 1 && (
                <button type="button" className="btn-icon" onClick={() => removeStep(i)}>✕</button>
              )}
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'A guardar...' : (isEdit ? 'Guardar alterações' : 'Criar receita')}
          </button>
        </div>
      </form>
    </div>
  )
}
