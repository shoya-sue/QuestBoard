import React from 'react';
import QuestBoard from './components/QuestBoard';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <QuestBoard />
      </div>
    </AuthProvider>
  );
}

export default App;
