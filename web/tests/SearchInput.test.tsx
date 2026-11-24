import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEARCH_DEBOUNCE_MS, SearchInput } from '@/components/SearchInput/SearchInput';

const replace = vi.fn();
let currentSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockClear();
    currentSearch = '';
  });

  afterEach(() => vi.useRealTimers());

  it('começa fechado e abre pelo botão', () => {
    render(<SearchInput />);
    const toggle = screen.getByRole('button', { name: 'Abrir busca' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Fechar busca' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('só navega 300 ms depois de parar de digitar', () => {
    render(<SearchInput />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir busca' }));
    const input = screen.getByRole('searchbox', { name: 'Buscar vídeos pelo título' });

    fireEvent.change(input, { target: { value: 'gin' } });
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50));
    fireEvent.change(input, { target: { value: 'gintama' } });
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1));
    expect(replace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/?search=gintama', { scroll: false });
  });

  it('abre preenchido com o termo da URL e limpa a busca pelo botão', () => {
    currentSearch = 'search=black+clover';
    render(<SearchInput />);

    expect(screen.getByRole('searchbox')).toHaveValue('black clover');
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(replace).toHaveBeenCalledWith('/', { scroll: false });
  });

  it('Enter busca na hora, sem esperar o debounce', () => {
    render(<SearchInput />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir busca' }));
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'orange' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(replace).toHaveBeenCalledWith('/?search=orange', { scroll: false });
  });
});
