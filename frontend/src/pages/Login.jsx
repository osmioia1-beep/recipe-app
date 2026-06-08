import { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../App'
import './Login.css'

export default function Login() {
  const { signIn, signUp, user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    navigate('/', { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password)
        if (error) throw error
        setError('Conta criada! Verifica o teu email para confirmar.')
      } else {
        const { error } = await signIn(email, password)
        if (error) throw error
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Erro ao autenticar. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🍳</div>
        <h1 className="login-title">Recipe App</h1>
        <p className="login-subtitle">
          {isSignUp ? 'Cria a tua conta' : 'Bem-vindo de volta!'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="o-teu@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'A processar...' : isSignUp ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <div className="login-switch">
          {isSignUp ? (
            <>
              Já tens conta?{' '}
              <button onClick={() => { setIsSignUp(false); setError('') }} className="btn-link">
                Entrar
              </button>
            </>
          ) : (
            <>
              Não tens conta?{' '}
              <button onClick={() => { setIsSignUp(true); setError('') }} className="btn-link">
                Registar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
