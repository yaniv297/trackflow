import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WelcomeModal from '../WelcomeModal';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const WelcomeModalWrapper = ({ isOpen = true, onClose = jest.fn() }) => (
  <WelcomeModal isOpen={isOpen} onClose={onClose} />
);

describe('WelcomeModal', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders welcome modal when isOpen is true', () => {
    render(<WelcomeModalWrapper isOpen={true} />);
    
    expect(screen.getByText(/Welcome to Trackflow v2.0!/)).toBeInTheDocument();
    expect(screen.getByText(/Thank you for using Trackflow!/)).toBeInTheDocument();
  });

  test('does not render when isOpen is false', () => {
    render(<WelcomeModalWrapper isOpen={false} />);
    
    expect(screen.queryByText(/Welcome to Trackflow v2.0!/)).not.toBeInTheDocument();
  });

  test('displays key feature highlights', () => {
    render(<WelcomeModalWrapper />);
    
    expect(screen.getByText(/Public WIP Songs/)).toBeInTheDocument();
    expect(screen.getByText(/Collaboration Requests/)).toBeInTheDocument();
    expect(screen.getByText(/New Homepage/)).toBeInTheDocument();
    expect(screen.getByText(/Achievements & Leaderboards/)).toBeInTheDocument();
    expect(screen.getByText(/New Notifications/)).toBeInTheDocument();
  });

  test('calls onClose when "Maybe later" button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<WelcomeModalWrapper onClose={mockOnClose} />);
    
    const maybeLaterButton = screen.getByText('Maybe later');
    fireEvent.click(maybeLaterButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close X button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<WelcomeModalWrapper onClose={mockOnClose} />);
    
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('navigates to Future Plans and closes when "Make my WIP public" is clicked', () => {
    const mockOnClose = jest.fn();
    render(<WelcomeModalWrapper onClose={mockOnClose} />);
    
    const makePublicButton = screen.getByText(/Make my WIP public/);
    fireEvent.click(makePublicButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/future');
  });


  test('calls onClose when background overlay is clicked', () => {
    const mockOnClose = jest.fn();
    render(<WelcomeModalWrapper onClose={mockOnClose} />);
    
    // Get the overlay (first div with the backdrop)
    const overlay = document.querySelector('[style*="position: fixed"]');
    fireEvent.click(overlay);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('does not call onClose when modal content is clicked', () => {
    const mockOnClose = jest.fn();
    render(<WelcomeModalWrapper onClose={mockOnClose} />);
    
    // Click on the modal content (not the overlay)
    const modalContent = screen.getByText(/Welcome to Trackflow v2.0!/).closest('div');
    fireEvent.click(modalContent);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});