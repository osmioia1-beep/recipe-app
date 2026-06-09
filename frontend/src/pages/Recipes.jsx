import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard'
import supabase from '../supabase'
import './Recipes.css'

const CATEGORIES = ['Todas', 'Sobremesas', 'Pratos Principais', 'Sopas', 'Saladas', 'Pequeno-Almoço', 'Lanches']
const DIFFICULTIES = ['Todas', '1', '2', '3', '4', '5']

export default function Recipes() {
  const [recipes, setRecipes] = useState([])
  const [filtered, setFiltered] = useState([])
  const [category, setCategory] = useState('Todas')
  const [difficulty, setDifficulty] = useState('Todas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadRecipes()
  }, [])

  useEffect(() => {
    let result = [...recipes]
    if (category !== 'Todas') {
      result = result.filter(r => r.category === category)
    }
    if (difficulty !== 'Todas') {
      result = result.filter(r => r.difficulty === parseInt(difficulty))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(q)))
      )
    }
    setFiltered(result)
  }, [category, difficulty, search, recipes])

  async function loadRecipes() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setRecipes(data || [])
      setFiltered(data || [])
    } catch (err) {
      console.error('Failed to load recipes:', err)
      setError('Erro ao carregar receitas. Tenta novamente.')
    }
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Receitas</h1>
        <div className="header-actions">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Pesquisar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn btn-sm btn-secondary" onClick={() => setShowFilters(!showFilters)}>
            Filtros {showFilters ? '▲' : '▼'}
          </button>
        </div>
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
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  className={`chip ${difficulty === d ? 'active' : ''}`}
                  onClick={() => setDifficulty(d)}
                >
                  {d === 'Todas' ? 'Todas' : '★'.repeat(parseInt(d))}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <div className="icon">⏳</div>
          <h3>A carregar receitas...</h3>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="icon">⚠️</div>
          <h3>{error}</h3>
          <button className="btn btn-primary" onClick={loadRecipes}>Tentar novamente</button>
        </div>
      ) : (
        <>
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
        </>
      )}

      <Link to="/recipes/new" className="btn-fab" title="Nova receita">+</Link>
    </div>
  )
}
