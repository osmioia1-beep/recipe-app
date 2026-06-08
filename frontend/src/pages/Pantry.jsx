import { useState, useEffect } from 'react'
import './Pantry.css'

const CATEGORIES = ['Frigorífico', 'Congelador', 'Despensa']

const DEMO_ITEMS = [
  { id: 1, name: 'Ovos', quantity: '12', category: 'Frigorífico', expiry: '2026-06-15' },
  { id: 2, name: 'Leite', quantity: '1L', category: 'Frigorífico', expiry: '2026-06-10' },
  { id: 3, name: 'Frango', quantity: '500g', category: 'Frigorífico', expiry: '2026-06-09' },
  { id: 4, name: 'Massa', quantity: '500g', category: 'Despensa', expiry: '2027-01-01' },
  { id: 5, name: 'Arroz', quantity: '1kg', category: 'Despensa', expiry: '2027-03-01' },
  { id: 6, name: 'Azeite', quantity: '500ml', category: 'Despensa', expiry: '2026-12-01' },
  { id: 7, name: 'Peixe congelado', quantity: '400g', category: 'Congelador', expiry: '2026-09-01' },
  { id: 8, name: 'Legumes congelados', quantity: '300g', category: 'Congelador', expiry: '2026-08-01' },
]

function getExpiryStatus(expiry) {
  if (!expiry) return 'ok'
  const now = new Date()
  const exp = new Date(expiry)
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'expired'
  if (diffDays <= 3) return 'warning'
  return 'ok'
}

function getExpiryLabel(status) {
  switch (status) {
    case 'expired': return { text: 'Expirado', class: 'badge-danger' }
    case 'warning': return { text: 'A expirar', class: 'badge-warning' }
    default: return { text: 'OK', class: 'badge-success' }
  }
}

export default function Pantry() {
  const [items, setItems] = useState(DEMO_ITEMS)
  const [activeCategory, setActiveCategory] = useState('Todas')
  const [showForm, setShowForm] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', quantity: '', category: 'Despensa', expiry: '' })
  const [error, setError] = useState('')

  const filtered = activeCategory === 'Todas'
    ? items
    : items.filter(i => i.category === activeCategory)

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat)
    return acc
  }, {})

  function handleAdd(e) {
    e.preventDefault()
    if (!newItem.name.trim()) {
      setError('Nome é obrigatório.')
      return
    }
    const item = {
      id: Date.now(),
      name: newItem.name.trim(),
      quantity: newItem.quantity.trim(),
      category: newItem.category,
      expiry: newItem.expiry || null,
    }
    setItems(prev => [...prev, item])
    setNewItem({ name: '', quantity: '', category: 'Despensa', expiry: '' })
    setShowForm(false)
    setError('')
  }

  function handleDelete(id) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Despensa</h1>
          <p className="subtitle">{items.length} itens guardados</p>
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕' : '+ Item'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="pantry-form">
          {error && <div className="form-error">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Nome *</label>
              <input
                type="text"
                className="form-control"
                value={newItem.name}
                onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Tomates"
              />
            </div>
            <div className="form-group">
              <label>Quantidade</label>
              <input
                type="text"
                className="form-control"
                value={newItem.quantity}
                onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))}
                placeholder="Ex: 500g"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Categoria</label>
              <select
                className="form-control"
                value={newItem.category}
                onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Validade</label>
              <input
                type="date"
                className="form-control"
                value={newItem.expiry}
                onChange={e => setNewItem(p => ({ ...p, expiry: e.target.value }))}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block">Adicionar</button>
        </form>
      )}

      {/* Category tabs */}
      <div className="chip-group pantry-tabs">
        <button
          className={`chip ${activeCategory === 'Todas' ? 'active' : ''}`}
          onClick={() => setActiveCategory('Todas')}
        >
          Todas ({items.length})
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat} ({grouped[cat]?.length || 0})
          </button>
        ))}
      </div>

      {/* Items list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🥫</div>
          <h3>Despensa vazia</h3>
          <p>Adiciona ingredientes para descobrir receitas que podes fazer.</p>
        </div>
      ) : (
        <div className="pantry-list">
          {filtered.map(item => {
            const status = getExpiryStatus(item.expiry)
            const expiryLabel = getExpiryLabel(status)
            return (
              <div key={item.id} className={`pantry-item pantry-item-${status}`}>
                <div className="pantry-item-info">
                  <div className="pantry-item-name">{item.name}</div>
                  <div className="pantry-item-details">
                    {item.quantity && <span>{item.quantity}</span>}
                    <span className="badge badge-info">{item.category}</span>
                    {item.expiry && (
                      <span className={`badge ${expiryLabel.class}`}>
                        {expiryLabel.text} ({new Date(item.expiry).toLocaleDateString('pt-PT')})
                      </span>
                    )}
                  </div>
                </div>
                <button className="btn-icon pantry-item-delete" onClick={() => handleDelete(item.id)}>🗑️</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
