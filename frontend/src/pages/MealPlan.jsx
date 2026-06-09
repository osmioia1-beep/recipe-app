import { useState, useEffect } from 'react'
import supabase from '../supabase'
import './MealPlan.css'

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const MEALS = [
  { key: 'breakfast', label: 'Pequeno-almoço' },
  { key: 'lunch', label: 'Almoço' },
  { key: 'dinner', label: 'Jantar' },
]

function getWeekDates() {
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

export default function MealPlan() {
  const [weekDates, setWeekDates] = useState(getWeekDates())
  const [plan, setPlan] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedDay, setExpandedDay] = useState(null)

  useEffect(() => {
    loadPlan()
  }, [])

  async function loadPlan() {
    setLoading(true)
    try {
      // Get week start (Monday)
      const monday = weekDates[0]
      const mondayStr = monday.toISOString().split('T')[0]

      // Fetch meal plans from Supabase
      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          id,
          date,
          meal_type,
          recipe:recipes(id, title, prep_time)
        `)
        .gte('date', mondayStr)
        .lt('date', getEndDateStr(monday))

      if (error) throw error

      // Build plan structure
      const initial = {}
      DAYS.forEach((day, i) => {
        initial[day] = {}
        MEALS.forEach(meal => {
          initial[day][meal.key] = null
        })
      })

      // Fill in fetched data
      const sortedDates = weekDates.map(d => d.toISOString().split('T')[0])
      if (data) {
        for (const mp of data) {
          const dayIndex = sortedDates.indexOf(mp.date)
          if (dayIndex !== -1 && mp.recipe) {
            const dayName = DAYS[dayIndex]
            initial[dayName][mp.meal_type] = {
              id: mp.id,
              title: mp.recipe.title,
              prep_time: mp.recipe.prep_time,
            }
          }
        }
      }

      setPlan(initial)
    } catch (err) {
      console.error('Failed to load meal plan:', err)
    }
    setLoading(false)
  }

  function getEndDateStr(monday) {
    const end = new Date(monday)
    end.setDate(end.getDate() + 7)
    return end.toISOString().split('T')[0]
  }

  function removeRecipe(day, mealKey) {
    const recipe = plan[day]?.[mealKey]
    if (!recipe?.id) return

    // Remove from Supabase in background
    supabase
      .from('meal_plans')
      .delete()
      .eq('id', recipe.id)
      .then(({ error }) => {
        if (error) console.error('Failed to remove:', error)
      })

    // Update UI immediately
    setPlan(prev => ({
      ...prev,
      [day]: { ...prev[day], [mealKey]: null },
    }))
  }

  function clearDay(day) {
    // Remove all recipes for this day from Supabase
    const dayRecipes = plan[day] || {}
    for (const mealKey of Object.keys(dayRecipes)) {
      const recipe = dayRecipes[mealKey]
      if (recipe?.id) {
        supabase
          .from('meal_plans')
          .delete()
          .eq('id', recipe.id)
          .then(({ error }) => {
            if (error) console.error('Failed to clear:', error)
          })
      }
    }

    // Update UI
    const cleared = {}
    MEALS.forEach(meal => {
      cleared[meal.key] = null
    })
    setPlan(prev => ({ ...prev, [day]: cleared }))
  }

  if (loading) {
    return (
      <div className="page">
        <div className="home-loading">A carregar planeamento...</div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Planeamento</h1>
          <p className="subtitle">
            Semana de {weekDates[0]?.toLocaleDateString('pt-PT')} a {weekDates[6]?.toLocaleDateString('pt-PT')}
          </p>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={loadPlan}>
          ↻
        </button>
      </div>

      <div className="mealplan-week">
        {DAYS.map((day, dayIndex) => {
          const date = weekDates[dayIndex]
          const isToday = date && date.toDateString() === new Date().toDateString()
          const isExpanded = expandedDay === day
          const dayMeals = plan[day] || {}
          const filledCount = MEALS.filter(m => dayMeals[m.key]?.title).length

          return (
            <div key={day} className={`mealplan-day ${isToday ? 'mealplan-day-today' : ''}`}>
              <div
                className="mealplan-day-header"
                onClick={() => setExpandedDay(isExpanded ? null : day)}
              >
                <div className="mealplan-day-info">
                  <span className="mealplan-day-name">{day}</span>
                  <span className="mealplan-day-date">
                    {date && date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="mealplan-day-count">
                  {filledCount > 0 && (
                    <span className="badge badge-success">
                      {filledCount} refeiç{filledCount > 1 ? 'ões' : 'ão'}
                    </span>
                  )}
                  <span className="mealplan-expand-icon">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="mealplan-day-meals">
                  {MEALS.map(meal => {
                    const recipe = dayMeals[meal.key]
                    return (
                      <div key={meal.key} className="mealplan-meal">
                        <div className="mealplan-meal-label">{meal.label}</div>
                        {recipe ? (
                          <div className="mealplan-meal-recipe">
                            <div className="mealplan-meal-info">
                              <span className="mealplan-meal-title">{recipe.title}</span>
                              {recipe.prep_time && (
                                <span className="mealplan-meal-time">⏱ {recipe.prep_time} min</span>
                              )}
                            </div>
                            <button
                              className="btn-icon mealplan-meal-remove"
                              onClick={() => removeRecipe(day, meal.key)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="mealplan-meal-empty">Sem refeição</div>
                        )}
                      </div>
                    )
                  })}
                  {filledCount > 0 && (
                    <button className="btn btn-sm btn-secondary mealplan-clear-day" onClick={() => clearDay(day)}>
                      Limpar dia
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
