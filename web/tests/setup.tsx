import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { afterEach, vi } from 'vitest';

afterEach(() => cleanup());

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean };

// next/image depende da configuração do build; nos testes basta um <img> comum.
vi.mock('next/image', () => ({
  default: ({ fill, priority, ...props }: ImageProps) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img data-fill={fill || undefined} data-priority={priority || undefined} {...props} />
  ),
}));
