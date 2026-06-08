import { Link } from 'react-router-dom'
import './RecipeCard.css'

export default function RecipeCard({ recipe, matchStatus }) {
  const { id, title, image_url, prep_time, difficulty, category } = recipe

  const difficultyLabel = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' }
  const difficultyClass = { easy: 'badge-success', medium: 'badge-warning', hard: 'badge-danger' }

  return (
    <Link to={`/recipes/${id}`} className="recipe-card">
      <div className="recipe-card-img-wrap">
        {image_url ? (
          <img src={image_url} alt={title} className="recipe-card-img" loading="lazy" />
        ) : (
          <div className="recipe-card-img recipe-card-placeholder">🍽️</div>
        )}
        {matchStatus && (
          <span className={`badge ${matchStatus.canMake ? 'badge-success' : 'badge-warning'} recipe-card-badge`}>
            {matchStatus.canMake ? '✓ Podes fazer!' : `Falta ${matchStatus.missing} ingrediente${matchStatus.missing > 1 ? 's' : ''}`}
          </span>
        )}
      </div>
      <div className="recipe-card-body">
        <h3 className="recipe-card-title">{title}</h3>
        <div className="recipe-card-meta">
          {prep_time && <span>⏱ {prep_time} min</span>}
          {difficulty && (
            <span className={`badge ${difficultyClass[difficulty] || 'badge-info'}`}>
              {difficultyLabel[difficulty] || difficulty}
            </span>
          )}
          {category && <span className="badge badge-info">{category}</span>}
        </div>
      </div>
    </Link>
  )
}
