import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard'
import supabase from '../supabase'
import './Recipes.css'

const CATEGORIES = [
  { key: 'Todas', label: '🍽️ Todas' },
  { key: 'Pratos Principais', label: '🍖 Pratos' },
  { key: 'Sobremesas', label: '🍰 Sobremesas' },
  { key: 'Sopas', label: '🍲 Sopas' },
  { key: 'Saladas', label: '🥗 Saladas' },
  { key: 'Pequeno-Almoço', label: '☕ P-A' },
  { key: 'Lanches', label: '🥪 Lanches' },
]

const SORT_OPTIONS = [
  { key: 'alpha', label: 'A-Z' },
  { key: 'diff_asc', label: 'Mais fácil' },
  { key: 'diff_desc', label: 'Mais difícil' },
  { key: 'time_asc', label: 'Mais rápido' },
]

export default function Recipes() {
  const [recipes, setRecipes] = useState([])
  const [filtered, setFiltered] = useState([])
  const [category, setCategory] = useState('Todas')
  const [sortBy, setSortBy] = useState('alpha')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadRecipes()
  }, [])

  useEffect(() => {
    let result = [...recipes]
    if (category !== 'Todas') {
      result = result.filter(r => r.category === category)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(q)))
      )
    }
    // Sort
    switch (sortBy) {
      case 'alpha':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'diff_asc':
        result.sort((a, b) => (a.difficulty || 3) - (b.difficulty || 3))
        break
      case 'diff_desc':
        result.sort((a, b) => (b.difficulty || 3) - (a.difficulty || 3))
        break
      case 'time_asc':
        result.sort((a, b) => (a.total_time || 999) - (b.total_time || 999))
        break
      default:
        break
    }
    setFiltered(result)
  }, [category, search, sortBy, recipes])

  async function loadRecipes() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('title', { ascending: true })
      if (error) throw error
      setRecipes(data || [])
      setFiltered(data || [])
    } catch (err) {
      console.error('Failed to load recipes:', err)
      setError('Erro ao carregar receitas. Tenta novamente.')
    }
    setLoading(false)
  }

  const hasActiveFilter = category !== 'Todas' || sortBy !== 'alpha'

  return (
    <div className="page">
      {/* TITLE */}
      <div className="recipes-page-header">
        <h1>Todas as Receitas</h1>
        <span className="recipes-count-badge">{recipes.length}</span>
      </div>

      {/* FILTERS */}
      <div className="recipes-filter-bar">
        <button
          className={`filter-toggle-btn ${showFilters || hasActiveFilter ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? '✕ Fechar' : '⚙️ Filtros'}
          {hasActiveFilter && <span className="filter-dot" />}
        </button>
        <button
          className={`filter-toggle-btn ${search ? 'active' : ''}`}
          onClick={() => {
            if (search) { setSearch(''); return }
            const el = document.getElementById('recipes-search')
            if (el) el.focus()
          }}
        >
          🔍 Pesquisar
        </button>
      </div>

      {showFilters && (
        <div className="recipes-filters-panel">
          {/* Category filter */}
          <div className="filter-section">
            <label className="filter-label">Categoria</label>
            <div className="chip-group">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  className={`chip ${category === c.key ? 'active' : ''}`}
                  onClick={() => setCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort filter */}
          <div className="filter-section">
            <label className="filter-label">Ordenar por</label>
            <div className="chip-group">
              {SORT_OPTIONS.map(s => (
                <button
                  key={s.key}
                  className={`chip chip-sort ${sortBy === s.key ? 'active' : ''}`}
                  onClick={() => setSortBy(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="search-wrapper">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            id="recipes-search"
            type="text"
            className="search-input"
            placeholder="Pesquisar receitas, ingredientes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </div>

      {/* RESULTS COUNT */}
      {!loading && !error && (
        <div className="recipes-results-info">
          {filtered.length === recipes.length ? (
            <span>{recipes.length} receitas</span>
          ) : (
            <span>{filtered.length} de {recipes.length} receitas</span>
          )}
          {hasActiveFilter && (
            <button className="clear-filters-btn" onClick={() => { setCategory('Todas'); setSortBy('alpha'); }}>
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* RECIPES GRID */}
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
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔍</div>
              <h3>Nenhuma receita encontrada</h3>
              <p>Tenta ajustar os filtros ou a pesquisa.</p>
              <button className="btn btn-secondary btn-sm" onClick={() => { setCategory('Todas'); setSearch(''); }}>
                Limpar tudo
              </button>
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
