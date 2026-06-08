import { useState, useEffect } from 'react'
import './MealPlan.css'

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const MEALS = ['Pequeno-almoço', 'Almoço', 'Jantar']

const DEMO_RECIPES = [
  { id: 1, title: 'Pasta Carbonara', prep_time: 20 },
  { id: 2, title: 'Frango Assado', prep_time: 45 },
  { id: 3, title: 'Salada Mediterrânica', prep_time: 10 },
  { id: 4, title: 'Arroz de Marisco', prep_time: 60 },
  { id: 5, title: 'Tacos de Carne', prep_time: 30 },
  { id: 6, title: 'Sopa de Legumes', prep_time: 25 },
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
  const [weekDates] = useState(getWeekDates())
  const [plan, setPlan] = useState(() => {
    const initial = {}
    DAYS.forEach(day => {
      initial[day] = { 'Pequeno-almoço': null, 'Almoço': null, 'Jantar': null }
    })
    // Demo: pre-fill some meals
    initial['Segunda']['Almoço'] = DEMO_RECIPES[0]
    initial['Segunda']['Jantar'] = DEMO_RECIPES[2]
    initial['Terça']['Almoço'] = DEMO_RECIPES[1]
    initial['Quarta']['Jantar'] = DEMO_RECIPES[4]
    return initial
  })
  const [showPicker, setShowPicker] = useState(null) // { day, meal }
  const [expandedDay, setExpandedDay] = useState(null)

  function assignRecipe(day, meal, recipe) {
    setPlan(prev => ({
      ...prev,
      [day]: { ...prev[day], [meal]: recipe },
    }))
    setShowPicker(null)
  }

  function removeRecipe(day, meal) {
    setPlan(prev => ({
      ...prev,
      [day]: { ...prev[day], [meal]: null },
    }))
  }

  function clearDay(day) {
    setPlan(prev => ({
      ...prev,
      [day]: { 'Pequeno-almoço': null, 'Almoço': null, 'Jantar': null },
    }))
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Planeamento</h1>
          <p className="subtitle">Semana de {weekDates[0]?.toLocaleDateString('pt-PT')} a {weekDates[6]?.toLocaleDateString('pt-PT')}</p>
        </div>
      </div>

      <div className="mealplan-week">
        {DAYS.map((day, dayIndex) => {
          const date = weekDates[dayIndex]
          const isToday = date && date.toDateString() === new Date().toDateString()
          const isExpanded = expandedDay === day
          const dayMeals = plan[day] || {}
          const filledCount = Object.values(dayMeals).filter(Boolean).length

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
                    <span className="badge badge-success">{filledCount} refeiç{filledCount > 1 ? 'ões' : 'ão'}</span>
                  )}
                  <span className="mealplan-expand-icon">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="mealplan-day-meals">
                  {MEALS.map(meal => {
                    const recipe = dayMeals[meal]
                    return (
                      <div key={meal} className="mealplan-meal">
                        <div className="mealplan-meal-label">{meal}</div>
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
                              onClick={() => removeRecipe(day, meal)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            className="mealplan-meal-add"
                            onClick={() => setShowPicker({ day, meal })}
                          >
                            + Adicionar receita
                          </button>
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

      {/* Recipe picker modal */}
      {showPicker && (
        <div className="mealplan-picker-overlay" onClick={() => setShowPicker(null)}>
          <div className="mealplan-picker" onClick={e => e.stopPropagation()}>
            <div className="mealplan-picker-header">
              <h3>Escolhe uma receita</h3>
              <button className="btn-icon" onClick={() => setShowPicker(null)}>✕</button>
            </div>
            <div className="mealplan-picker-list">
              {DEMO_RECIPES.map(recipe => (
                <button
                  key={recipe.id}
                  className="mealplan-picker-item"
                  onClick={() => assignRecipe(showPicker.day, showPicker.meal, recipe)}
                >
                  <span className="mealplan-picker-title">{recipe.title}</span>
                  <span className="mealplan-picker-time">⏱ {recipe.prep_time} min</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
