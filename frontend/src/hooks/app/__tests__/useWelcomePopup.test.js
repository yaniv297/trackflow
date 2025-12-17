import { renderHook, act } from '@testing-library/react';
import { useWelcomePopup } from '../useWelcomePopup';

const WELCOME_POPUP_KEY = 'trackflow_v2_welcome_dismissed';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('useWelcomePopup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('does not show popup when user is not authenticated', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => 
      useWelcomePopup(false, false)
    );
    
    expect(result.current.showWelcomePopup).toBe(false);
  });

  test('does not show popup while loading', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => 
      useWelcomePopup(true, true)
    );
    
    expect(result.current.showWelcomePopup).toBe(false);
  });

  test('shows popup for authenticated user who has not dismissed it', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => 
      useWelcomePopup(true, false)
    );
    
    // Initially false
    expect(result.current.showWelcomePopup).toBe(false);
    
    // After timeout
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(result.current.showWelcomePopup).toBe(true);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(WELCOME_POPUP_KEY);
  });

  test('does not show popup if user has already dismissed it', () => {
    mockLocalStorage.getItem.mockReturnValue('1');
    
    const { result } = renderHook(() => 
      useWelcomePopup(true, false)
    );
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(result.current.showWelcomePopup).toBe(false);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(WELCOME_POPUP_KEY);
  });

  test('dismissWelcomePopup hides popup and saves to localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => 
      useWelcomePopup(true, false)
    );
    
    // Show popup first
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.showWelcomePopup).toBe(true);
    
    // Dismiss popup
    act(() => {
      result.current.dismissWelcomePopup();
    });
    
    expect(result.current.showWelcomePopup).toBe(false);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(WELCOME_POPUP_KEY, '1');
  });

  test('resetWelcomePopup shows popup and removes from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('1');
    
    const { result } = renderHook(() => 
      useWelcomePopup(true, false)
    );
    
    // Initially not shown because it was dismissed
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.showWelcomePopup).toBe(false);
    
    // Reset popup
    act(() => {
      result.current.resetWelcomePopup();
    });
    
    expect(result.current.showWelcomePopup).toBe(true);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(WELCOME_POPUP_KEY);
  });
});