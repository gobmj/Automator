import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// Mock all child components
vi.mock('./components/OrderList', () => ({
  default: () => <div>OrderList Component</div>,
}))

vi.mock('./components/OrderForm', () => ({
  default: () => <div>OrderForm Component</div>,
}))

vi.mock('./components/OrderDetails', () => ({
  default: () => <div>OrderDetails Component</div>,
}))

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText(/Order Manager/i)).toBeInTheDocument()
  })

  it('renders navigation bar', () => {
    render(<App />)
    expect(screen.getByText(/Order Manager/i)).toBeInTheDocument()
    expect(screen.getByText(/Order Management Platform for Manufacturing/i)).toBeInTheDocument()
  })

  it('renders footer', () => {
    render(<App />)
    expect(screen.getByText(/© 2026 Order Management System/i)).toBeInTheDocument()
    expect(screen.getByText(/BITS Dissertation Project/i)).toBeInTheDocument()
  })

  it('renders system status indicator', () => {
    render(<App />)
    expect(screen.getByText(/System Active/i)).toBeInTheDocument()
  })

  it('renders OrderList component on default route', () => {
    render(<App />)
    expect(screen.getByText(/OrderList Component/i)).toBeInTheDocument()
  })
})