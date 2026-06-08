import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import supabase from './supabase'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Recipes from './pages/Recipes'
import RecipeDetail from './pages/RecipeDetail'
import RecipeForm from './pages/RecipeForm'
import Pantry from './pages/Pantry'
import MealPlan from './pages/MealPlan'
import Login from './pages/Login'
import './App.css'

export const AuthContext = createContext(null)

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password })
  }, [])

  const signUp = useCallback(async (email, password) => {
    return await supabase.auth.signUp({ email, password })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  if (loading) {
    return <div className="app-loading">A carregar...</div>
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, loading }}>
      <BrowserRouter>
        <div className="app">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/recipes/new" element={<RecipeForm />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/recipes/:id/edit" element={<RecipeForm />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/mealplan" element={<MealPlan />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <NavBar />
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

export default App
