import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Historial } from './pages/Historial';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/historial" element={<Historial />} />
      </Routes>
    </Router>
  );
}

export default App;