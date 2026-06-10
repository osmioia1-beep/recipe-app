import { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../App'
import supabase from '../supabase'
import { getFoodImageUrl } from '../utils/images'
import './RecipeDetail.css'

const DUMMY_USER = '00000000-0000-0000-0000-000000000000'

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

  useEffect(() => {
    loadRecipe()
    loadPantry()
  }, [id, user])

  async function loadPantry() {
    try {
      // Try logged-in user first, then fall back to dummy user
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
          <button className="btn btn-primary btn-block">📅 Adicionar ao planeamento</button>
          <button className="btn btn-secondary btn-block">🛒 Ingredientes em falta</button>
        </div>
      </div>
    </div>
  )
}
