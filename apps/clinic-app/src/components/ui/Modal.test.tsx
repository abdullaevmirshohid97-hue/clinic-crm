import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal component', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and children when isOpen is true', () => {
    const { getByText } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="My Modal">
        <p>Modal body text</p>
      </Modal>
    );
    expect(getByText('My Modal')).toBeTruthy();
    expect(getByText('Modal body text')).toBeTruthy();
  });

  it('calls onClose when the × button is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Close Test"><p>body</p></Modal>
    );
    fireEvent.click(container.querySelector('.modal-close')!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} title="Escape Test"><p>esc</p></Modal>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does NOT call onClose on Escape when modal is closed', () => {
    const onClose = vi.fn();
    render(<Modal isOpen={false} onClose={onClose} title="Closed"><p>x</p></Modal>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders with custom width prop', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Wide Modal" width={800}>
        <p>wide</p>
      </Modal>
    );
    const modalContainer = container.querySelector('.modal-container') as HTMLElement;
    expect(modalContainer.style.maxWidth).toBe('800px');
  });

  it('defaults to 500px width when no width prop is given', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Default Width"><p>x</p></Modal>
    );
    const modalContainer = container.querySelector('.modal-container') as HTMLElement;
    expect(modalContainer.style.maxWidth).toBe('500px');
  });
});
