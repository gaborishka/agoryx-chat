import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useToast, ToastProvider } from '@/lib/hooks/useToast';
import React from 'react';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(ToastProvider, null, children);
  };
}

describe('useToast hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useToast context', () => {
    it('should throw error when used outside ToastProvider', () => {
      expect(() => {
        renderHook(() => useToast());
      }).toThrow('useToast must be used within a ToastProvider');
    });

    it('should not throw error when used within ToastProvider', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.toasts).toEqual([]);
    });
  });

  describe('addToast', () => {
    it('should add a toast to the list', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addToast('success', 'Test message');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('success');
      expect(result.current.toasts[0].message).toBe('Test message');
    });

    it('should add multiple toasts', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addToast('success', 'Success message');
        result.current.addToast('error', 'Error message');
        result.current.addToast('info', 'Info message');
      });

      expect(result.current.toasts).toHaveLength(3);
      expect(result.current.toasts[0].type).toBe('success');
      expect(result.current.toasts[1].type).toBe('error');
      expect(result.current.toasts[2].type).toBe('info');
    });

    it('should generate unique ids for toasts', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addToast('success', 'Message 1');
        result.current.addToast('success', 'Message 2');
      });

      const ids = result.current.toasts.map((t) => t.id);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('should use default duration of 3000ms', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addToast('success', 'Test message');
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should use custom duration', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addToast('success', 'Test message', 5000);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should not auto-remove toast when duration is 0', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addToast('error', 'Persistent message', 0);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('removeToast', () => {
    it('should remove a toast by id', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addToast('success', 'Test message', 0);
      });

      const toastId = result.current.toasts[0].id;

      act(() => {
        result.current.removeToast(toastId);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should only remove the specified toast', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addToast('success', 'Message 1', 0);
        result.current.addToast('error', 'Message 2', 0);
        result.current.addToast('info', 'Message 3', 0);
      });

      const toastToRemove = result.current.toasts[1].id;

      act(() => {
        result.current.removeToast(toastToRemove);
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts[0].message).toBe('Message 1');
      expect(result.current.toasts[1].message).toBe('Message 3');
    });

    it('should handle removing non-existent toast gracefully', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addToast('success', 'Test message', 0);
      });

      act(() => {
        result.current.removeToast('non-existent-id');
      });

      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('success helper', () => {
    it('should add success toast', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.success('Operation successful');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('success');
      expect(result.current.toasts[0].message).toBe('Operation successful');
    });

    it('should accept custom duration', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.success('Operation successful', 5000);
      });

      expect(result.current.toasts[0].duration).toBe(5000);
    });
  });

  describe('error helper', () => {
    it('should add error toast', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.error('Something went wrong');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('error');
      expect(result.current.toasts[0].message).toBe('Something went wrong');
    });

    it('should accept custom duration', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.error('Error message', 10000);
      });

      expect(result.current.toasts[0].duration).toBe(10000);
    });
  });

  describe('info helper', () => {
    it('should add info toast', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.info('For your information');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('info');
      expect(result.current.toasts[0].message).toBe('For your information');
    });
  });

  describe('warning helper', () => {
    it('should add warning toast', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.warning('Be careful');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('warning');
      expect(result.current.toasts[0].message).toBe('Be careful');
    });
  });

  describe('toast lifecycle', () => {
    it('should auto-remove toasts in order', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addToast('success', 'First', 1000);
      });

      act(() => {
        vi.advanceTimersByTime(100);
        result.current.addToast('error', 'Second', 2000);
      });

      expect(result.current.toasts).toHaveLength(2);

      act(() => {
        vi.advanceTimersByTime(900);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Second');

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle rapid toast additions', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: createWrapper(),
      });

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addToast('info', `Toast ${i}`, 0);
        }
      });

      expect(result.current.toasts).toHaveLength(10);
    });
  });
});
