'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import styles from './SearchInput.module.css';

export const SEARCH_DEBOUNCE_MS = 300;

/** Busca por título: abre pelo ícone do header e reflete o termo em `/?search=`. */
export function SearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTerm = searchParams.get('search') ?? '';

  const [term, setTerm] = useState(urlTerm);
  const [open, setOpen] = useState(urlTerm !== '');
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Mantém o campo em sincronia quando a URL muda por fora (voltar, "Limpar busca").
  const [lastUrlTerm, setLastUrlTerm] = useState(urlTerm);
  if (urlTerm !== lastUrlTerm) {
    setLastUrlTerm(urlTerm);
    setTerm(urlTerm);
    if (urlTerm) setOpen(true);
  }

  function navigate(value: string) {
    const trimmed = value.trim();
    if (trimmed === urlTerm.trim() && (pathname === '/' || !trimmed)) return;
    const href = trimmed ? `/?search=${encodeURIComponent(trimmed)}` : '/';
    startTransition(() => router.replace(href, { scroll: false }));
  }

  // Debounce: só navega depois de 300 ms sem digitar.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => navigate(term), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigate depende só de term/URL
  }, [term]);

  function toggle() {
    if (open && term) {
      setTerm('');
      navigate('');
      inputRef.current?.focus();
      return;
    }
    setOpen((value) => !value);
    if (!open) requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <form
      role="search"
      className={styles.search}
      data-open={open || undefined}
      data-pending={pending || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(term);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Buscar vídeos pelo título
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        name="search"
        className={styles.input}
        placeholder="Buscar vídeos…"
        autoComplete="off"
        maxLength={100}
        value={term}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        onChange={(event) => setTerm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !term) setOpen(false);
        }}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={toggle}
        aria-label={open && term ? 'Limpar busca' : open ? 'Fechar busca' : 'Abrir busca'}
        aria-expanded={open}
        aria-controls={inputId}
      >
        <Icon name={open && term ? 'close' : 'search'} />
      </button>
    </form>
  );
}

/** Mesmo visual, sem interação: usado como fallback enquanto a URL não está disponível. */
export function SearchInputFallback() {
  return (
    <div className={styles.search}>
      <span className={styles.toggle} aria-hidden="true">
        <Icon name="search" />
      </span>
    </div>
  );
}
