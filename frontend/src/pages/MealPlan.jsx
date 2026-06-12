import { useState, useEffect, useMemo } from 'react'
import supabase from '../supabase'
import './MealPlan.css'

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const DAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MEALS = [
  { key: 'breakfast', label: 'Pequeno-almoço', icon: '🌅' },
  { key: 'lunch', label: 'Almoço', icon: '🍽️' },
  { key: 'snack', label: 'Lanche', icon: '🍎' },
  { key: 'dinner', label: 'Jantar', icon: '🌙' },
]

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

function formatDate(d) {
  return d.toISOString().split('T')[0]
}

function isSameDay(a, b) {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday = 0
}

export default function MealPlan() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekDates, setWeekDates] = useState(() => getWeekDates(getMonday(new Date())))
  const [plan, setPlan] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedDay, setExpandedDay] = useState(null)

  useEffect(() => {
    const monday = getMonday(selectedDate)
    setWeekDates(getWeekDates(monday))
  }, [selectedDate])

  useEffect(() => {
    loadPlan()
  }, [weekDates])

  async function loadPlan() {
    setLoading(true)
    try {
      const monday = weekDates[0]
      const mondayStr = formatDate(monday)
      const sundayStr = formatDate(weekDates[6])

      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          id,
          date,
          meal_type,
          recipe:recipes(id, title, prep_time)
        `)
        .gte('date', mondayStr)
        .lte('date', sundayStr)

      if (error) throw error

      const initial = {}
      DAYS.forEach((day, i) => {
        initial[day] = {}
        MEALS.forEach(meal => {
          initial[day][meal.key] = null
        })
      })

      const sortedDates = weekDates.map(d => formatDate(d))
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

  function removeRecipe(day, mealKey) {
    const recipe = plan[day]?.[mealKey]
    if (!recipe?.id) return

    supabase
      .from('meal_plans')
      .delete()
      .eq('id', recipe.id)
      .then(({ error }) => {
        if (error) console.error('Failed to remove:', error)
      })

    setPlan(prev => ({
      ...prev,
      [day]: { ...prev[day], [mealKey]: null },
    }))
  }

  function clearDay(day) {
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

    const cleared = {}
    MEALS.forEach(meal => {
      cleared[meal.key] = null
    })
    setPlan(prev => ({ ...prev, [day]: cleared }))
  }

  function prevMonth() {
    setCurrentMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { year: prev.year, month: prev.month - 1 }
    })
  }

  function nextMonth() {
    setCurrentMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { year: prev.year, month: prev.month + 1 }
    })
  }

  function goToToday() {
    const today = new Date()
    setSelectedDate(today)
    setCurrentMonth({ year: today.getFullYear(), month: today.getMonth() })
  }

  // Calendar grid
  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const prevMonthDays = getDaysInMonth(year, month === 0 ? 11 : month - 1)

    const cells = []
    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        inMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      })
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        inMonth: true,
        date: new Date(year, month, d),
      })
    }
    // Next month padding
    const remaining = 42 - cells.length // 6 rows x 7 cols
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        day: d,
        inMonth: false,
        date: new Date(year, month + 1, d),
      })
    }
    return cells
  }, [currentMonth])

  const today = new Date()

  // Count meals for calendar dots
  const dayMealCount = useMemo(() => {
    const counts = {}
    DAYS.forEach((day, i) => {
      const dateStr = formatDate(weekDates[i])
      const dayMeals = plan[day] || {}
      const count = MEALS.filter(m => dayMeals[m.key]?.title).length
      counts[dateStr] = count
    })
    return counts
  }, [plan, weekDates])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Planeamento</h1>
          <p className="subtitle">
            {DAYS[0]} {weekDates[0]?.getDate()} — {DAYS[6]} {weekDates[6]?.getDate()} {MONTHS[weekDates[6]?.getMonth()]}
          </p>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={loadPlan}>
          ↻
        </button>
      </div>

      {/* Calendar */}
      <div className="mealplan-calendar">
        <div className="calendar-header">
          <button className="btn-icon calendar-nav" onClick={prevMonth}>‹</button>
          <button className="calendar-month-label" onClick={goToToday}>
            {MONTHS[currentMonth.month]} {currentMonth.year}
          </button>
          <button className="btn-icon calendar-nav" onClick={nextMonth}>›</button>
        </div>
        <div className="calendar-grid">
          {DAYS_SHORT.map(d => (
            <div key={d} className="calendar-weekday">{d}</div>
          ))}
          {calendarDays.map((cell, i) => {
            const dateStr = formatDate(cell.date)
            const isToday = isSameDay(cell.date, today)
            const isSelected = isSameDay(cell.date, selectedDate)
            const count = dayMealCount[dateStr] || 0
            return (
              <button
                key={i}
                className={`calendar-cell ${!cell.inMonth ? 'calendar-cell-other' : ''} ${isToday ? 'calendar-cell-today' : ''} ${isSelected ? 'calendar-cell-selected' : ''}`}
                onClick={() => {
                  setSelectedDate(cell.date)
                  if (!cell.inMonth) {
                    setCurrentMonth({ year: cell.date.getFullYear(), month: cell.date.getMonth() })
                  }
                }}
              >
                <span className="calendar-cell-day">{cell.day}</span>
                {count > 0 && (
                  <span className="calendar-cell-dots">
                    {Array.from({ length: Math.min(count, 4) }).map((_, j) => (
                      <span key={j} className="calendar-dot" />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="home-loading">A carregar planeamento...</div>
      ) : (
        <div className="mealplan-week">
          {DAYS.map((day, dayIndex) => {
            const date = weekDates[dayIndex]
            const isToday = isSameDay(date, today)
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
                          <div className="mealplan-meal-label">
                            <span className="mealplan-meal-icon">{meal.icon}</span>
                            {meal.label}
                          </div>
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
      )}
    </div>
  )
}
