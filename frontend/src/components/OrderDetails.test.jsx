import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import OrderDetails from './OrderDetails'
import orderService from '../services/orderService'

// Mock the orderService
vi.mock('../services/orderService', () => ({
  default: {
    getOrderById: vi.fn(),
    releaseOrder: vi.fn(),
    deleteOrder: vi.fn(),
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

describe('OrderDetails Component', () => {
  const mockOrder = {
    orderId: 'ORD-2026-001',
    orderNumber: 'TEST-001',
    material: 'FORKLIFT-FRAME',
    quantity: 5,
    status: 'CREATED',
    priority: 500,
    plant: 'DT6364',
    createdDate: '2026-04-08T00:00:00Z',
    scheduledStartDate: '2026-04-09T00:00:00Z',
    scheduledCompletionDate: '2026-04-15T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    orderService.getOrderById.mockResolvedValue({
      success: true,
      data: mockOrder,
    })
  })

  it('renders without crashing', async () => {
    render(
      <MemoryRouter initialEntries={['/orders/ORD-2026-001']}>
        <Routes>
          <Route path="/orders/:orderId" element={<OrderDetails />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Order Details/i)).toBeInTheDocument()
    })
  })

  it('displays loading state initially', () => {
    orderService.getOrderById.mockImplementation(() => new Promise(() => {}))

    render(
      <MemoryRouter initialEntries={['/orders/ORD-2026-001']}>
        <Routes>
          <Route path="/orders/:orderId" element={<OrderDetails />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText(/Loading order details/i)).toBeInTheDocument()
  })

  it('fetches and displays order details', async () => {
    render(
      <MemoryRouter initialEntries={['/orders/ORD-2026-001']}>
        <Routes>
          <Route path="/orders/:orderId" element={<OrderDetails />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(orderService.getOrderById).toHaveBeenCalledWith('ORD-2026-001')
    })

    await waitFor(() => {
      expect(screen.getByText('TEST-001')).toBeInTheDocument()
      expect(screen.getByText('FORKLIFT-FRAME')).toBeInTheDocument()
    })
  })

  it('displays error message when fetch fails', async () => {
    orderService.getOrderById.mockRejectedValue({
      response: { data: { error: 'Order not found' } },
    })

    render(
      <MemoryRouter initialEntries={['/orders/ORD-2026-001']}>
        <Routes>
          <Route path="/orders/:orderId" element={<OrderDetails />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Order not found/i)).toBeInTheDocument()
    })
  })
})