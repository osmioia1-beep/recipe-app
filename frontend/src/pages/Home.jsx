import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../App'
import RecipeCard from '../components/RecipeCard'
import supabase from '../supabase'
import './Home.css'

export default function Home() {
  const { user } = useContext(AuthContext)
  const [recipes, setRecipes] = useState([])
  const [pantryItems, setPantryItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return // prevent re-fetch
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      // Fetch recipes from Supabase
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
      if (recipesError) throw recipesError
      setRecipes(recipesData || [])

      // Fetch pantry items from Supabase
      let pantry = []
      try {
        const { data: pantryData, error: pantryError } = await supabase
          .from('pantry_items')
          .select('name')
        if (!pantryError && pantryData) {
          pantry = pantryData.map(p => p.name.toLowerCase())
        }
      } catch (e) {
        console.warn('Pantry fetch failed, continuing without it:', e.message)
      }
      setPantryItems(pantry)

      setLoaded(true)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Erro ao carregar dados. Tenta novamente.')
    }
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="home-hero">
        <h1 className="home-title">O que posso cozinhar?</h1>
        <p className="home-subtitle">
          {user ? `Olá! ` : ''}Descobre receitas com os ingredientes que tens na despensa.
        </p>
      </div>

      <div className="home-pantry-bar">
        <Link to="/pantry" className="home-pantry-link">
          🥫 A minha despensa
          <span className="badge badge-info">{pantryItems.length} itens</span>
        </Link>
      </div>

      {loading ? (
        <div className="home-loading">A procurar receitas...</div>
      ) : error ? (
        <div className="empty-state">
          <div className="icon">⚠️</div>
          <h3>{error}</h3>
          <button className="btn btn-primary" onClick={() => { setLoaded(false); loadData() }}>Tentar novamente</button>
        </div>
      ) : (
        <>
          <h2 className="home-section-title">
            Todas as receitas
            <span className="badge badge-success">{recipes.length}</span>
          </h2>
          <div className="grid grid-2">
            {recipes.slice(0, 6).map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          {recipes.length > 6 && (
            <div className="home-see-all">
              <Link to="/recipes" className="btn btn-secondary">Ver todas as receitas →</Link>
            </div>
          )}
        </>
      )}

      <Link to="/recipes/new" className="btn-fab" title="Nova receita">+</Link>
    </div>
  )
}
