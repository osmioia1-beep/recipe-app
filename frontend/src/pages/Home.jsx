import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../App'
import RecipeCard from '../components/RecipeCard'
import supabase from '../supabase'
import './Home.css'

export default function Home() {
  const { user } = useContext(AuthContext)
  const [allRecipes, setAllRecipes] = useState([])
  const [pantryItems, setPantryItems] = useState([])
  const [matchedRecipes, setMatchedRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      // Fetch all recipes with their ingredients from Supabase
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*, recipe_ingredients(name)')
        .order('title', { ascending: true })
      if (recipesError) throw recipesError
      setAllRecipes(recipesData || [])

      // Fetch pantry items from Supabase
      let pantry = []
      try {
        const { data: pantryData, error: pantryError } = await supabase
          .from('pantry_items')
          .select('name')
        if (!pantryError && pantryData) {
          pantry = pantryData.map(p => p.name.toLowerCase().trim())
        }
      } catch (e) {
        console.warn('Pantry fetch failed, continuing without it:', e.message)
      }
      setPantryItems(pantry)

      // Calculate matches based on real ingredients
      const matched = (recipesData || []).map(recipe => {
        const matchResult = checkMatch(recipe, pantry)
        return { ...recipe, match: matchResult }
      })

      // Sort: can make first, then by fewest missing, then alphabetical
      matched.sort((a, b) => {
        if (a.match.canMake && !b.match.canMake) return -1
        if (!a.match.canMake && b.match.canMake) return 1
        if (a.match.missing !== b.match.missing) return a.match.missing - b.match.missing
        return a.title.localeCompare(b.title)
      })

      setMatchedRecipes(matched)
      setLoaded(true)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Erro ao carregar dados. Tenta novamente.')
    }
    setLoading(false)
  }

  function checkMatch(recipe, pantry) {
    if (!pantry.length) return { canMake: false, missing: 0, total: 0, matched: 0 }
    const recipeIngredients = (recipe.recipe_ingredients || []).map(i => i.name.toLowerCase().trim())
    if (!recipeIngredients.length) return { canMake: false, missing: 0, total: 0, matched: 0 }

    let matched = 0
    let total = recipeIngredients.length
    let missing = 0
    const missingItems = []

    for (const ing of recipeIngredients) {
      const has = pantry.some(p => p.includes(ing) || ing.includes(p))
      if (has) {
        matched++
      } else {
        missing++
        missingItems.push(ing)
      }
    }

    return { canMake: missing === 0, missing, total, matched, missingItems }
  }

  // Filter: only show recipes that can be made, or if no pantry, show all
  const hasPantry = pantryItems.length > 0
  const displayRecipes = hasPantry
    ? matchedRecipes.filter(r => r.match.canMake)
    : matchedRecipes

  const canMakeCount = matchedRecipes.filter(r => r.match.canMake).length
  const canAlmostMakeCount = matchedRecipes.filter(r => !r.match.canMake && r.match.missing <= 2 && r.match.matched > 0).length

  return (
    <div className="page">
      <div className="home-hero">
        <h1 className="home-title">O que posso cozinhar?</h1>
        <p className="home-subtitle">
          {user ? 'Descobre receitas com os ingredientes que tens.' : 'Adiciona a tua despensa para ver o que podes cozinhar.'}
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
          {/* SECTION: Can make now */}
          {hasPantry && canMakeCount > 0 && (
            <>
              <h2 className="home-section-title">
                ✅ Podes fazer agora
                <span className="badge badge-success">{canMakeCount}</span>
              </h2>
              <div className="grid grid-2">
                {matchedRecipes
                  .filter(r => r.match.canMake)
                  .map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} matchStatus={recipe.match} />
                  ))}
              </div>
            </>
          )}

          {/* SECTION: Almost can make (missing 1-2 ingredients) */}
          {hasPantry && canAlmostMakeCount > 0 && (
            <>
              <h2 className="home-section-title home-section-alt">
                🔶 Quase lá (faltam 1-2 ingredientes)
                <span className="badge badge-warning">{canAlmostMakeCount}</span>
              </h2>
              <div className="grid grid-2">
                {matchedRecipes
                  .filter(r => !r.match.canMake && r.match.missing <= 2 && r.match.matched > 0)
                  .slice(0, 4)
                  .map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} matchStatus={recipe.match} />
                  ))}
              </div>
            </>
          )}

          {/* SECTION: No pantry — show all recipes */}
          {!hasPantry && (
            <>
              <h2 className="home-section-title">
                Todas as receitas
                <span className="badge badge-success">{allRecipes.length}</span>
              </h2>
              <div className="grid grid-2">
                {allRecipes.slice(0, 6).map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
              {allRecipes.length > 6 && (
                <div className="home-see-all">
                  <Link to="/recipes" className="btn btn-secondary">Ver todas as receitas →</Link>
                </div>
              )}
            </>
          )}

          {/* Empty state: pantry exists but nothing matches */}
          {hasPantry && canMakeCount === 0 && canAlmostMakeCount === 0 && (
            <div className="empty-state">
              <div className="icon">🥘</div>
              <h3>Nenhuma receita encontrada</h3>
              <p>Adiciona mais itens à tua despensa para descobrir receitas.</p>
              <Link to="/pantry" className="btn btn-primary btn-sm">Ir à despensa</Link>
            </div>
          )}

          {/* See all link (when pantry exists and has results) */}
          {hasPantry && (canMakeCount > 0 || canAlmostMakeCount > 0) && (
            <div className="home-see-all">
              <Link to="/recipes" className="btn btn-secondary">Todas as receitas →</Link>
            </div>
          )}
        </>
      )}

      <Link to="/recipes/new" className="btn-fab" title="Nova receita">+</Link>
    </div>
  )
}
