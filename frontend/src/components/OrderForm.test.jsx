import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import OrderForm from './OrderForm'
import orderService from '../services/orderService'

// Mock the orderService
vi.mock('../services/orderService', () => ({
  default: {
    getOrderById: vi.fn(),
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
  },
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('OrderForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create form without crashing', () => {
    render(
      <BrowserRouter>
        <OrderForm />
      </BrowserRouter>
    )
    expect(screen.getByText(/Create New Order/i)).toBeInTheDocument()
  })

  it('renders all form fields', () => {
    render(
      <BrowserRouter>
        <OrderForm />
      </BrowserRouter>
    )

    expect(screen.getByPlaceholderText(/e.g., TEST-001/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e.g., FORKLIFT-FRAME/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter quantity/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/1-1000/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e.g., DT6364/i)).toBeInTheDocument()
  })

  it('displays loading state when fetching order for edit', async () => {
    orderService.getOrderById.mockImplementation(() => new Promise(() => {}))

    render(
      <MemoryRouter initialEntries={['/orders/edit/ORD-001']}>
        <Routes>
          <Route path="/orders/edit/:orderId" element={<OrderForm />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Loading/i)).toBeInTheDocument()
    })
  })

  it('renders submit button', () => {
    render(
      <BrowserRouter>
        <OrderForm />
      </BrowserRouter>
    )

    const submitButton = screen.getByRole('button', { name: /Create Order/i })
    expect(submitButton).toBeInTheDocument()
  })
})