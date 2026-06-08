import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard'
import './Recipes.css'

const CATEGORIES = ['Todas', 'Italiana', 'Carnes', 'Saladas', 'Peixe', 'Mexicana', 'Sopas', 'Sobremesas']
const DIFFICULTIES = ['Todas', 'easy', 'medium', 'hard']
const TIMES = [
  { label: 'Todos', value: 0 },
  { label: '< 15 min', value: 15 },
  { label: '< 30 min', value: 30 },
  { label: '< 1 hora', value: 60 },
]

const DEMO_RECIPES = [
  { id: 1, title: 'Pasta Carbonara', prep_time: 20, difficulty: 'medium', category: 'Italiana', image_url: null },
  { id: 2, title: 'Frango Assado com Batatas', prep_time: 45, difficulty: 'easy', category: 'Carnes', image_url: null },
  { id: 3, title: 'Salada Mediterrânica', prep_time: 10, difficulty: 'easy', category: 'Saladas', image_url: null },
  { id: 4, title: 'Arroz de Marisco', prep_time: 60, difficulty: 'hard', category: 'Peixe', image_url: null },
  { id: 5, title: 'Tacos de Carne', prep_time: 30, difficulty: 'medium', category: 'Mexicana', image_url: null },
  { id: 6, title: 'Sopa de Legumes', prep_time: 25, difficulty: 'easy', category: 'Sopas', image_url: null },
]

export default function Recipes() {
  const [recipes, setRecipes] = useState(DEMO_RECIPES)
  const [filtered, setFiltered] = useState(DEMO_RECIPES)
  const [category, setCategory] = useState('Todas')
  const [difficulty, setDifficulty] = useState('Todas')
  const [maxTime, setMaxTime] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let result = [...recipes]
    if (category !== 'Todas') {
      result = result.filter(r => r.category === category)
    }
    if (difficulty !== 'Todas') {
      result = result.filter(r => r.difficulty === difficulty)
    }
    if (maxTime > 0) {
      result = result.filter(r => r.prep_time <= maxTime)
    }
    setFiltered(result)
  }, [category, difficulty, maxTime, recipes])

  return (
    <div className="page">
      <div className="page-header">
        <h1>Receitas</h1>
        <button className="btn btn-sm btn-secondary" onClick={() => setShowFilters(!showFilters)}>
          Filtros {showFilters ? '▲' : '▼'}
        </button>
      </div>

      {showFilters && (
        <div className="recipes-filters">
          <div className="filter-group">
            <label>Categoria</label>
            <div className="chip-group">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  className={`chip ${category === c ? 'active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Dificuldade</label>
            <div className="chip-group">
              <button className={`chip ${difficulty === 'Todas' ? 'active' : ''}`} onClick={() => setDifficulty('Todas')}>Todas</button>
              <button className={`chip ${difficulty === 'easy' ? 'active' : ''}`} onClick={() => setDifficulty('easy')}>Fácil</button>
              <button className={`chip ${difficulty === 'medium' ? 'active' : ''}`} onClick={() => setDifficulty('medium')}>Médio</button>
              <button className={`chip ${difficulty === 'hard' ? 'active' : ''}`} onClick={() => setDifficulty('hard')}>Difícil</button>
            </div>
          </div>

          <div className="filter-group">
            <label>Tempo</label>
            <div className="chip-group">
              {TIMES.map(t => (
                <button
                  key={t.value}
                  className={`chip ${maxTime === t.value ? 'active' : ''}`}
                  onClick={() => setMaxTime(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="recipes-count">{filtered.length} receita{filtered.length !== 1 ? 's' : ''}</div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔍</div>
          <h3>Nenhuma receita encontrada</h3>
          <p>Tenta ajustar os filtros.</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {filtered.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      <Link to="/recipes/new" className="btn-fab" title="Nova receita">+</Link>
    </div>
  )
}
