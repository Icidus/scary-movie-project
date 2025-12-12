import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import HomePage from './pages/HomePage';
import MoviePage from './pages/MoviePage';
import UserPage from './pages/UserPage';
import NotFoundPage from './pages/NotFoundPage';
import StatsPage from './pages/StatsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/movie/:tmdbId" element={<MoviePage />} />
            <Route path="/tv/:tmdbId" element={<MoviePage />} />
            <Route path="/u/:uid" element={<UserPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
