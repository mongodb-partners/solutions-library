import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { SolutionDetailPage } from './pages/SolutionDetailPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/solutions/:id" element={<SolutionDetailPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
