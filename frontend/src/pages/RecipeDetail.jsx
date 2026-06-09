import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import supabase from '../supabase'
import { getFoodImageUrl } from '../utils/images'
import './RecipeDetail.css'

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const MEALS = [
  { key: 'lunch', label: 'Almoço' },
  { key: 'dinner', label: 'Jantar' },
]

function getNextWeekDates() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [planDay, setPlanDay] = useState('')
  const [planMeal, setPlanMeal] = useState('lunch')
  const [planSaving, setPlanSaving] = useState(false)
  const [planSuccess, setPlanSuccess] = useState(false)
  const [weekDates] = useState(getNextWeekDates)

  useEffect(() => {
    loadRecipe()
  }, [id])

  async function loadRecipe() {
    setLoading(true)
    setError(null)
    try {
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()
      if (recipeError) throw recipeError
      setRecipe(recipeData)

      const { data: ingData, error: ingError } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)
        .order('id')
      if (!ingError) setIngredients(ingData || [])
    } catch (err) {
      console.error('Failed to load recipe:', err)
      setError('Erro ao carregar receita.')
    }
    setLoading(false)
  }

  async function handleAddToPlan() {
    if (!planDay || !planMeal) return
    setPlanSaving(true)
    setPlanSuccess(false)
    try {
      const dayIndex = DAYS.indexOf(planDay)
      const date = weekDates[dayIndex]
      const dateStr = date.toISOString().split('T')[0]

      const { error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          recipe_id: id,
          date: dateStr,
          meal_type: planMeal,
        })
      if (error) throw error
      setPlanSuccess(true)
      setTimeout(() => setShowPlanModal(false), 1200)
    } catch (err) {
      console.error('Failed to add to meal plan:', err)
    }
    setPlanSaving(false)
  }

  if (loading) {
    return <div className="page"><div className="detail-loading">A carregar...</div></div>
  }

  if (!recipe) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="icon">😕</div>
          <h3>Receita não encontrada</h3>
          <p>Esta receita não existe ou foi removida.</p>
          <Link to="/recipes" className="btn btn-primary btn-sm">Ver todas as receitas</Link>
        </div>
      </div>
    )
  }

  const difficultyNum = typeof recipe.difficulty === 'number' ? recipe.difficulty : 2
  const difficultyLabel = difficultyNum <= 1 ? 'Fácil' : difficultyNum <= 3 ? 'Médio' : 'Difícil'
  const difficultyClass = difficultyNum <= 1 ? 'badge-success' : difficultyNum <= 3 ? 'badge-warning' : 'badge-danger'

  return (
    <div className="recipe-detail">
      <div className="detail-img-wrap">
        <img
          src={recipe.image_url || getFoodImageUrl(recipe.title, recipe.id)}
          alt={recipe.title}
          className="detail-img"
          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
        />
        <div className="detail-img detail-placeholder" style={{ display: 'none' }}>
          <span className="placeholder-icon">🍳</span>
          <span className="placeholder-text">{recipe.title}</span>
        </div>
        <button className="btn-icon detail-back" onClick={() => navigate(-1)}>←</button>
      </div>

      <div className="detail-content">
        <h1 className="detail-title">{recipe.title}</h1>
        {recipe.description && <p className="detail-desc">{recipe.description}</p>}

        <div className="detail-meta">
          {(recipe.prep_time || recipe.cook_time || recipe.total_time) && (
            <div className="detail-meta-item">
              <span className="detail-meta-icon">⏱</span>
              <span>{recipe.total_time || recipe.prep_time} min</span>
            </div>
          )}
          <div className="detail-meta-item">
            <span className={`badge ${difficultyClass}`}>{difficultyLabel} {'★'.repeat(difficultyNum)}</span>
          </div>
          {recipe.portions && (
            <div className="detail-meta-item">
              <span className="detail-meta-icon">👥</span>
              <span>{recipe.portions} porções</span>
            </div>
          )}
          {recipe.category && (
            <div className="detail-meta-item">
              <span className="badge badge-info">{recipe.category}</span>
            </div>
          )}
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="detail-tags">
            {recipe.tags.map((tag, i) => (
              <span key={i} className="tag">#{tag}</span>
            ))}
          </div>
        )}

        <div className="detail-section">
          <h2 className="detail-section-title">Ingredientes</h2>
          {ingredients.length > 0 ? (
            <ul className="detail-ingredients">
              {ingredients.map((ing, i) => (
                <li key={i} className="detail-ingredient">
                  <span className="detail-ingredient-qty">
                    {ing.quantity} {ing.unit}
                  </span>
                  <span className="detail-ingredient-name">
                    {ing.optional ? '🔸 ' : ''}{ing.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Sem ingredientes listados.</p>
          )}
        </div>

        {recipe.steps && recipe.steps.length > 0 && (
          <div className="detail-section">
            <h2 className="detail-section-title">Preparação</h2>
            <ol className="detail-steps">
              {recipe.steps.map((step, i) => (
                <li key={i} className="detail-step">
                  <span className="detail-step-num">{i + 1}</span>
                  <span className="detail-step-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="detail-actions">
          <button
            className="btn btn-primary btn-block"
            onClick={() => { setShowPlanModal(true); setPlanSuccess(false) }}
          >
            📅 Adicionar ao planeamento
          </button>
          <button className="btn btn-secondary btn-block">🛒 Ingredientes em falta</button>
        </div>
      </div>

      {/* Meal Plan Modal */}
      {showPlanModal && (
        <div className="mealplan-picker-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="mealplan-picker" onClick={e => e.stopPropagation()}>
            <div className="mealplan-picker-header">
              <h3>Adicionar ao planeamento</h3>
              <button className="btn-icon" onClick={() => setShowPlanModal(false)}>✕</button>
            </div>

            {planSuccess ? (
              <div className="plan-success">
                <span className="plan-success-icon">✅</span>
                <p>Receita adicionada!</p>
              </div>
            ) : (
              <>
                <div className="plan-form-group">
                  <label>Dia da semana</label>
                  <div className="plan-day-chips">
                    {DAYS.map((day, i) => (
                      <button
                        key={day}
                        className={`chip ${planDay === day ? 'active' : ''}`}
                        onClick={() => setPlanDay(day)}
                      >
                        {day.slice(0, 3)}
                        <span className="plan-date-hint">
                          {weekDates[i]?.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="plan-form-group">
                  <label>Refeição</label>
                  <div className="plan-meal-chips">
                    {MEALS.map(meal => (
                      <button
                        key={meal.key}
                        className={`chip ${planMeal === meal.key ? 'active' : ''}`}
                        onClick={() => setPlanMeal(meal.key)}
                      >
                        {meal.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-block"
                  onClick={handleAddToPlan}
                  disabled={!planDay || !planMeal || planSaving}
                >
                  {planSaving ? 'A guardar...' : 'Confirmar'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
