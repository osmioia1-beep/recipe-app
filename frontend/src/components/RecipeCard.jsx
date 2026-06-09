import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getFoodImageUrl } from '../utils/images'
import './RecipeCard.css'

const PALETTES = [
  ['#ff6b6b', '#ee5a24'],
  ['#feca57', '#ff9f43'],
  ['#48dbfb', '#0abde3'],
  ['#ff9ff3', '#f368e0'],
  ['#54a0ff', '#2e86de'],
  ['#5f27cd', '#341f97'],
  ['#00d2d3', '#01a3a4'],
  ['#1dd1a1', '#10ac84'],
]

function getColor(id) {
  const idx = Math.abs((id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % PALETTES.length
  return PALETTES[idx]
}

function getInitials(title) {
  return title.split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

export default function RecipeCard({ recipe, matchStatus }) {
  const { id, title, prep_time, difficulty, category, tags } = recipe
  const [imgError, setImgError] = useState(false)
  const [from, to] = getColor(id || title)
  const imgSrc = getFoodImageUrl(title, id)

  const diffNum = typeof difficulty === 'number' ? difficulty : 2
  const diffLabel = diffNum <= 1 ? 'Fácil' : diffNum <= 3 ? 'Médio' : 'Difícil'
  const diffClass = diffNum <= 1 ? 'badge-success' : diffNum <= 3 ? 'badge-warning' : 'badge-danger'

  return (
    <Link to={`/recipes/${id}`} className="recipe-card">
      <div className="recipe-card-img-wrap">
        {imgError ? (
          <div className="recipe-card-img recipe-card-placeholder" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
            <span className="placeholder-initials">{getInitials(title)}</span>
          </div>
        ) : (
          <img src={imgSrc} alt={title} className="recipe-card-img" loading="lazy" onError={() => setImgError(true)} />
        )}
        {matchStatus && (
          <span className={`badge ${matchStatus.canMake ? 'badge-success' : 'badge-warning'} recipe-card-badge`}>
            {matchStatus.canMake ? '✓ Podes fazer!' : `Falta ${matchStatus.missing}`}
          </span>
        )}
      </div>
      <div className="recipe-card-body">
        <h3 className="recipe-card-title">{title}</h3>
        <div className="recipe-card-meta">
          {prep_time && <span>⏱ {prep_time} min</span>}
          {typeof difficulty === 'number' && (
            <span className={`badge ${diffClass}`}>{diffLabel}</span>
          )}
        </div>
        {category && <span className="badge badge-info">{category}</span>}
        {tags && tags.length > 0 && (
          <div className="recipe-card-tags">
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="tag-mini">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
