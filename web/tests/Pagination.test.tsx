import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Pagination } from '@/components/Pagination/Pagination';

describe('Pagination', () => {
  it('não renderiza com uma página só', () => {
    const { container } = render(<Pagination page={1} totalPages={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marca a página atual e preserva a busca nos links', () => {
    render(<Pagination page={2} totalPages={3} search="gintama" />);

    expect(screen.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Página 1' })).toHaveAttribute(
      'href',
      '/?search=gintama',
    );
    expect(screen.getByRole('link', { name: 'Página anterior' })).toHaveAttribute(
      'href',
      '/?search=gintama',
    );
    expect(screen.getByRole('link', { name: 'Próxima página' })).toHaveAttribute(
      'href',
      '/?search=gintama&page=3',
    );
  });

  it('desabilita as setas nas pontas', () => {
    render(<Pagination page={1} totalPages={2} />);
    expect(screen.queryByRole('link', { name: 'Página anterior' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Próxima página' })).toHaveAttribute(
      'href',
      '/?page=2',
    );
  });
});
