import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import Workspace from './components/Workspace';
import './App.css';
import { ApolloProvider } from '@apollo/client';
import client from './client';

function App() {
  return (
    <ApolloProvider client={client}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workspace" element={<Workspace />} />
        </Routes>
      </Router>
    </ApolloProvider>
  );
}

export default App;