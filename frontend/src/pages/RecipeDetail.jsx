import { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../App'
import supabase from '../supabase'
import { getFoodImageUrl } from '../utils/images'
import './RecipeDetail.css'

const DUMMY_USER = '00000000-0000-0000-0000-000000000000'

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const DAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MEALS = [
  { key: 'breakfast', label: '🌅 Pequeno-almoço' },
  { key: 'lunch', label: '🍽️ Almoço' },
  { key: 'snack', label: '🍎 Lanche' },
  { key: 'dinner', label: '🌙 Jantar' },
]

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function getWeekDates(monday) {
  return DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function isSameDay(a, b) {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [pantryItems, setPantryItems] = useState([])
  const [pantryLoaded, setPantryLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Meal plan picker state
  const [showPicker, setShowPicker] = useState(false)
  const [pickerStep, setPickerStep] = useState('date') // 'date' | 'meal' | 'success'
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedMeal, setSelectedMeal] = useState(null)
  const [saving, setSaving] = useState(false)

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  useEffect(() => {
    loadRecipe()
    loadPantry()
  }, [id, user])

  async function loadPantry() {
    try {
      const userId = user?.id || DUMMY_USER
      const { data, error } = await supabase
        .from('pantry_items')
        .select('name')
        .eq('user_id', userId)
      if (!error && data) {
        setPantryItems(data.map(p => p.name.toLowerCase().trim()))
      }
    } catch (e) {
      console.warn('Pantry load failed:', e.message)
    }
    setPantryLoaded(true)
  }

  function checkIngredientAvailability(ingName) {
    if (!pantryItems.length) return null
    const name = ingName.toLowerCase().trim()
    return pantryItems.some(p => p.includes(name) || name.includes(p))
  }

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

  function openPicker() {
    setShowPicker(true)
    setPickerStep('date')
    setSelectedDate(null)
    setSelectedMeal(null)
    const now = new Date()
    setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() })
  }

  function closePicker() {
    setShowPicker(false)
    setPickerStep('date')
    setSelectedDate(null)
    setSelectedMeal(null)
  }

  function selectDate(date) {
    setSelectedDate(formatDate(date))
    setPickerStep('meal')
  }

  function prevMonth() {
    setCalendarMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { year: prev.year, month: prev.month - 1 }
    })
  }

  function nextMonth() {
    setCalendarMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { year: prev.year, month: prev.month + 1 }
    })
  }

  async function selectMeal(mealKey) {
    setSaving(true)
    setSelectedMeal(mealKey)
    try {
      const userId = user?.id || DUMMY_USER
      const { error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userId,
          recipe_id: recipe.id,
          date: selectedDate,
          meal_type: mealKey,
        })
      if (error) throw error
      setPickerStep('success')
      setTimeout(() => {
        closePicker()
      }, 1500)
    } catch (err) {
      console.error('Failed to add to meal plan:', err)
      setError('Erro ao adicionar ao planeamento.')
      closePicker()
    }
    setSaving(false)
  }

  // Calendar grid for picker
  const calendarDays = (() => {
    const { year, month } = calendarMonth
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const prevMonthDays = getDaysInMonth(year, month === 0 ? 11 : month - 1)
    const cells = []
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, inMonth: false, date: new Date(year, month - 1, prevMonthDays - i) })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, inMonth: true, date: new Date(year, month, d) })
    }
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) })
    }
    return cells
  })()

  const today = new Date()

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

  const availableCount = ingredients.filter(i => checkIngredientAvailability(i.name) === true).length
  const totalIngredients = ingredients.length
  const allAvailable = availableCount === totalIngredients && totalIngredients > 0
  const hasPantry = pantryItems.length > 0 && pantryLoaded

  const weekDates = getWeekDates(getMonday(new Date()))

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
        <Link to={`/recipes/${id}/edit`} className="btn-icon detail-edit" title="Editar receita">✏️</Link>
      </div>

      <div className="detail-content">
        <h1 className="detail-title">{recipe.title}</h1>
        {recipe.description && <p className="detail-desc">{recipe.description}</p>}

        <div className="detail-meta">
          {(recipe.prep_time || recipe.cook_time || recipe.total_time) && (
            <div className="detail-meta-item">
              <span className="detail-meta-icon">⏱</span>
              <span>{recipe.total_time || (recipe.prep_time + (recipe.cook_time || 0))} min</span>
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

        {/* Ingredients with availability */}
        <div className="detail-section">
          <div className="detail-section-header">
            <h2 className="detail-section-title">🧄 Ingredientes</h2>
            {hasPantry && (
              <span className={`badge ${allAvailable ? 'badge-success' : 'badge-warning'}`}>
                {allAvailable ? '✅ Tens tudo!' : `${availableCount}/${totalIngredients} disponíveis`}
              </span>
            )}
          </div>
          {ingredients.length > 0 ? (
            <ul className="detail-ingredients">
              {ingredients.map((ing, i) => {
                const available = checkIngredientAvailability(ing.name)
                const rowClass = available === true ? 'ingredient-available' : available === false ? 'ingredient-missing' : ''
                const statusIcon = available === true ? '✅' : available === false ? '❌' : '❓'
                return (
                  <li key={i} className={`detail-ingredient ${rowClass}`}>
                    <span className="detail-ingredient-status">{statusIcon}</span>
                    <span className="detail-ingredient-qty">
                      {ing.quantity} {ing.unit}
                    </span>
                    <span className="detail-ingredient-name">
                      {ing.optional && <span className="ingredient-optional">opcional </span>}
                      {ing.name}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-muted">Sem ingredientes listados.</p>
          )}
          {!hasPantry && (
            <p className="pantry-hint">💡 Adiciona itens à tua despensa para veres o que tens disponível.</p>
          )}
        </div>

        {recipe.steps && recipe.steps.length > 0 && (
          <div className="detail-section">
            <h2 className="detail-section-title">📋 Preparação</h2>
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
          <button className="btn btn-primary btn-block" onClick={openPicker}>📅 Adicionar ao planeamento</button>
          <button className="btn btn-secondary btn-block">🛒 Ingredientes em falta</button>
        </div>
      </div>

      {/* Meal Plan Picker Modal */}
      {showPicker && (
        <div className="mealplan-picker-overlay" onClick={(e) => { if (e.target === e.currentTarget) closePicker() }}>
          <div className="mealplan-picker">
            {pickerStep === 'date' && (
              <>
                <div className="mealplan-picker-header">
                  <button className="plan-back-btn" onClick={prevMonth}>‹</button>
                  <h3 className="picker-month-label">
                    {MONTHS[calendarMonth.month]} {calendarMonth.year}
                  </h3>
                  <button className="plan-back-btn" onClick={nextMonth}>›</button>
                </div>
                <div className="plan-calendar-grid">
                  {DAYS_SHORT.map(d => (
                    <div key={d} className="plan-calendar-weekday">{d}</div>
                  ))}
                  {calendarDays.map((cell, i) => {
                    const dateStr = formatDate(cell.date)
                    const isToday = isSameDay(cell.date, today)
                    const isSelected = selectedDate === dateStr
                    return (
                      <button
                        key={i}
                        className={`plan-calendar-cell ${!cell.inMonth ? 'plan-calendar-cell-other' : ''} ${isToday ? 'plan-calendar-cell-today' : ''} ${isSelected ? 'plan-calendar-cell-selected' : ''}`}
                        onClick={() => selectDate(cell.date)}
                      >
                        {cell.day}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {pickerStep === 'meal' && (
              <>
                <div className="mealplan-picker-header">
                  <button className="plan-back-btn" onClick={() => setPickerStep('date')}>← Voltar</button>
                  <h3>Escolhe a refeição</h3>
                  <button className="btn-icon" onClick={closePicker}>✕</button>
                </div>
                <p className="plan-selected-day">
                  {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="plan-meal-list">
                  {MEALS.map(meal => (
                    <button key={meal.key} className="plan-meal-item" onClick={() => selectMeal(meal.key)} disabled={saving}>
                      <span className="plan-meal-label">{meal.label}</span>
                      <span className="plan-meal-arrow">→</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {pickerStep === 'success' && (
              <>
                <div className="mealplan-picker-header">
                  <h3>✅ Sucesso!</h3>
                  <button className="btn-icon" onClick={closePicker}>✕</button>
                </div>
                <div className="plan-success">
                  <span className="plan-success-icon">🎉</span>
                  <p>Receita adicionada ao planeamento!</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
