import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock @react-oauth/google
jest.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock components
jest.mock('./components/QuestBoard', () => {
  return function QuestBoard() {
    return <div>Quest Board</div>;
  };
});

jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

test('renders Quest Board', () => {
  render(<App />);
  const questBoardElement = screen.getByText(/Quest Board/i);
  expect(questBoardElement).toBeInTheDocument();
});
