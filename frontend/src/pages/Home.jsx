import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../App'
import RecipeCard from '../components/RecipeCard'
import './Home.css'

// Demo data until backend is connected
const DEMO_RECIPES = [
  { id: 1, title: 'Pasta Carbonara', prep_time: 20, difficulty: 'medium', category: 'Italiana', image_url: null },
  { id: 2, title: 'Frango Assado com Batatas', prep_time: 45, difficulty: 'easy', category: 'Carnes', image_url: null },
  { id: 3, title: 'Salada Mediterrânica', prep_time: 10, difficulty: 'easy', category: 'Saladas', image_url: null },
  { id: 4, title: 'Arroz de Marisco', prep_time: 60, difficulty: 'hard', category: 'Peixe', image_url: null },
  { id: 5, title: 'Tacos de Carne', prep_time: 30, difficulty: 'medium', category: 'Mexicana', image_url: null },
  { id: 6, title: 'Sopa de Legumes', prep_time: 25, difficulty: 'easy', category: 'Sopas', image_url: null },
]

export default function Home() {
  const { user } = useContext(AuthContext)
  const [recipes, setRecipes] = useState(DEMO_RECIPES)
  const [pantryItems, setPantryItems] = useState([])
  const [matchedRecipes, setMatchedRecipes] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    // In production, fetch from Supabase
    // const { data: pantryData } = await supabase.from('pantry_items').select('*')
    // For now use demo data
    const demoPantry = ['massa', 'ovos', 'bacon', 'frango', 'batatas', 'azeite', 'sal', 'alho', 'cebola', 'arroz']
    setPantryItems(demoPantry)

    // Calculate matches
    const matched = DEMO_RECIPES.map(recipe => {
      const matchResult = checkMatch(recipe, demoPantry)
      return { ...recipe, match: matchResult }
    }).sort((a, b) => {
      if (a.match.canMake && !b.match.canMake) return -1
      if (!a.match.canMake && b.match.canMake) return 1
      return a.match.missing - b.match.missing
    })

    setMatchedRecipes(matched)
    setLoading(false)
  }

  function checkMatch(recipe, pantry) {
    // Simple demo matching
    const keywords = recipe.title.toLowerCase().split(' ')
    let missing = 0
    for (const word of keywords) {
      const has = pantry.some(p => p.includes(word) || word.includes(p))
      if (!has && word.length > 2) missing++
    }
    return { canMake: missing <= 1, missing }
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
      ) : (
        <>
          <h2 className="home-section-title">
            Receitas que podes fazer
            <span className="badge badge-success">{matchedRecipes.filter(r => r.match.canMake).length}</span>
          </h2>
          <div className="grid grid-2">
            {matchedRecipes.filter(r => r.match.canMake).map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} matchStatus={recipe.match} />
            ))}
          </div>

          {matchedRecipes.filter(r => !r.match.canMake).length > 0 && (
            <>
              <h2 className="home-section-title home-section-alt">
                Quase lá!
              </h2>
              <div className="grid grid-2">
                {matchedRecipes.filter(r => !r.match.canMake).map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} matchStatus={recipe.match} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <Link to="/recipes/new" className="btn-fab" title="Nova receita">+</Link>
    </div>
  )
}
