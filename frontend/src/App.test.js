import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple test to verify the setup
test('renders basic React test', () => {
  const TestComponent = () => <div data-testid="test">Test Component</div>;
  render(<TestComponent />);
  const element = screen.getByTestId('test');
  expect(element).toBeInTheDocument();
});
