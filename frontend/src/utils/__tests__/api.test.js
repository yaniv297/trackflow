import { apiCall, ApiError } from '../api';

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.location
delete window.location;
window.location = { protocol: 'http:', hostname: 'localhost' };

// Mock config
jest.mock('../../config', () => ({
  API_BASE_URL: 'http://localhost:8000',
}));

describe('API Client Error Handling', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('ApiError class', () => {
    test('creates ApiError with message, status, and detail', () => {
      const error = new ApiError('Test error', 500, 'Detailed error message');
      
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(500);
      expect(error.detail).toBe('Detailed error message');
      expect(error.name).toBe('ApiError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('HTTP error responses (4xx/5xx)', () => {
    test('throws ApiError with detail from FastAPI error response', async () => {
      const errorResponse = { detail: 'Pack creation failed: invalid status argument' };
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          get: jest.fn((header) => {
            if (header === 'content-type') return 'application/json';
            return null;
          }),
        },
        json: jest.fn().mockResolvedValueOnce(errorResponse),
      });

      try {
        await apiCall('/test');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.message).toBe('Pack creation failed: invalid status argument');
        expect(error.status).toBe(500);
        expect(error.detail).toBe('Pack creation failed: invalid status argument');
      }
    });

    test('throws ApiError with fallback message when detail is missing', async () => {
      const errorResponse = { message: 'Custom error message' };
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: {
          get: jest.fn((header) => {
            if (header === 'content-type') return 'application/json';
            return null;
          }),
        },
        json: jest.fn().mockResolvedValueOnce(errorResponse),
      });

      try {
        await apiCall('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.message).toBe('Custom error message');
        expect(error.status).toBe(400);
      }
    });

    test('throws ApiError with status code when JSON parsing fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          get: jest.fn((header) => {
            if (header === 'content-type') return 'text/plain';
            return null;
          }),
        },
        json: jest.fn().mockRejectedValueOnce(new Error('Not JSON')),
        text: jest.fn().mockResolvedValueOnce('Internal Server Error'),
      });

      try {
        await apiCall('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.message).toBe('Internal Server Error');
        expect(error.status).toBe(500);
      }
    });

    test('throws ApiError with default message when response has no content', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          get: jest.fn(() => null),
        },
        json: jest.fn().mockRejectedValueOnce(new Error('Parse error')),
        text: jest.fn().mockResolvedValueOnce(''),
      });

      try {
        await apiCall('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.message).toContain('HTTP error! status: 500');
        expect(error.status).toBe(500);
      }
    });
  });

  describe('Network errors', () => {
    test('throws ApiError for TypeError: Failed to fetch', async () => {
      fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      try {
        await apiCall('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.message).toContain('Network error');
        expect(error.status).toBeNull();
      }
    });

    test('re-throws non-fetch TypeError errors as-is', async () => {
      const originalError = new TypeError('Some other error');
      fetch.mockRejectedValueOnce(originalError);

      await expect(apiCall('/test')).rejects.toThrow(originalError);
    });
  });

  describe('Successful responses', () => {
    test('returns JSON data for successful responses', async () => {
      const responseData = { id: 1, name: 'Test' };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn((header) => {
            if (header === 'content-type') return 'application/json';
            if (header === 'content-length') return null;
            return null;
          }),
        },
        json: jest.fn().mockResolvedValueOnce(responseData),
      });

      const result = await apiCall('/test');
      expect(result).toEqual(responseData);
    });

    test('returns null for 204 No Content responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: {
          get: jest.fn((header) => {
            if (header === 'content-length') return '0';
            return null;
          }),
        },
      });

      const result = await apiCall('/test');
      expect(result).toBeNull();
    });
  });
});

