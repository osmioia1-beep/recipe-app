import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import './RecipeDetail.css'

const DEMO_RECIPES = {
  1: {
    id: 1,
    title: 'Pasta Carbonara',
    description: 'A autêntica carbonara italiana com ovos, queijo pecorino e guanciale. Sem natas!',
    image_url: null,
    prep_time: 20,
    difficulty: 'medium',
    category: 'Italiana',
    servings: 4,
    ingredients: [
      { name: 'Spaghetti', quantity: '400g' },
      { name: 'Guanciale (ou bacon)', quantity: '200g' },
      { name: 'Gemas de ovo', quantity: '4' },
      { name: 'Pecorino Romano', quantity: '100g' },
      { name: 'Pimenta preta', quantity: 'q.b.' },
    ],
    steps: [
      'Cozer a massa em água salgada abundante segundo as instruções da embalagem.',
      'Cortar o guanciale em tiras e fritar numa frigideira sem óleo até ficar crocante.',
      'Numa tigela, bater as gemas com o pecorino ralado e pimenta preta.',
      'Quando a massa estiver al dente, escorrer e juntar ao guanciale.',
      'Retirar do fogo e misturar a mistura de ovos, mexendo rapidamente.',
      'Servir imediatamente com mais pecorino por cima.',
    ],
  },
  2: {
    id: 2,
    title: 'Frango Assado com Batatas',
    description: 'Frango inteiro assado no forno com batatas douradas e ervas aromáticas.',
    image_url: null,
    prep_time: 45,
    difficulty: 'easy',
    category: 'Carnes',
    servings: 4,
    ingredients: [
      { name: 'Frango inteiro', quantity: '1.5kg' },
      { name: 'Batatas', quantity: '800g' },
      { name: 'Azeite', quantity: '4 colheres de sopa' },
      { name: 'Alho', quantity: '4 dentes' },
      { name: 'Alecrim', quantity: 'q.b.' },
      { name: 'Sal e pimenta', quantity: 'q.b.' },
    ],
    steps: [
      'Pré-aquecer o forno a 200°C.',
      'Temperar o frango com sal, pimenta, alho picado e azeite.',
      'Descascar e cortar as batatas em quartos.',
      'Dispor as batatas numa assadeira, temperar com azeite e alecrim.',
      'Colocar o frango por cima das batatas.',
      'Assar durante 45-50 minutos até dourar.',
      'Deixar repousar 5 minutos antes de servir.',
    ],
  },
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecipe()
  }, [id])

  async function loadRecipe() {
    setLoading(true)
    // In production: const { data } = await supabase.from('recipes').select('*').eq('id', id).single()
    const data = DEMO_RECIPES[id]
    setRecipe(data || null)
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

  const difficultyLabel = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' }
  const difficultyClass = { easy: 'badge-success', medium: 'badge-warning', hard: 'badge-danger' }

  return (
    <div className="recipe-detail">
      <div className="detail-img-wrap">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.title} className="detail-img" />
        ) : (
          <div className="detail-img detail-placeholder">🍽️</div>
        )}
        <button className="btn-icon detail-back" onClick={() => navigate(-1)}>←</button>
        <Link to={`/recipes/${id}/edit`} className="btn-icon detail-edit">✏️</Link>
      </div>

      <div className="detail-content">
        <h1 className="detail-title">{recipe.title}</h1>
        {recipe.description && <p className="detail-desc">{recipe.description}</p>}

        <div className="detail-meta">
          <div className="detail-meta-item">
            <span className="detail-meta-icon">⏱</span>
            <span>{recipe.prep_time} min</span>
          </div>
          <div className="detail-meta-item">
            <span className={`badge ${difficultyClass[recipe.difficulty]}`}>
              {difficultyLabel[recipe.difficulty]}
            </span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-icon">👥</span>
            <span>{recipe.servings} porções</span>
          </div>
          {recipe.category && (
            <div className="detail-meta-item">
              <span className="badge badge-info">{recipe.category}</span>
            </div>
          )}
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">Ingredientes</h2>
          <ul className="detail-ingredients">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="detail-ingredient">
                <span className="detail-ingredient-qty">{ing.quantity}</span>
                <span className="detail-ingredient-name">{ing.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">Preparação</h2>
          <ol className="detail-steps">
            {recipe.steps.map((step, i) => (
              <li key={i} className="detail-step">
                <span className="detail-step-num">{i + 1}</span>
                <span className="detail-step-text">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="detail-actions">
          <button className="btn btn-primary btn-block">📅 Adicionar ao planeamento</button>
          <button className="btn btn-secondary btn-block">🛒 Ingredientes em falta → Lista de compras</button>
        </div>
      </div>
    </div>
  )
}
