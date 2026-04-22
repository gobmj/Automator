import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import OrderList from './OrderList'
import orderService from '../services/orderService'

// Mock the orderService
vi.mock('../services/orderService', () => ({
  default: {
    getAllOrders: vi.fn(),
    deleteOrder: vi.fn(),
    releaseOrder: vi.fn(),
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

describe('OrderList Component', () => {
  const mockOrders = [
    {
      orderId: 'ORD-2026-001',
      orderNumber: 'TEST-001',
      material: 'FORKLIFT-FRAME',
      quantity: 5,
      status: 'CREATED',
      priority: 500,
      plant: 'DT6364',
      createdDate: '2026-04-08T00:00:00Z',
    },
    {
      orderId: 'ORD-2026-002',
      orderNumber: 'TEST-002',
      material: 'BIKE',
      quantity: 3,
      status: 'RELEASABLE',
      priority: 600,
      plant: 'DT6364',
      createdDate: '2026-04-08T00:00:00Z',
    },
  ]

  const mockPagination = {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    orderService.getAllOrders.mockResolvedValue({
      data: mockOrders,
      pagination: mockPagination,
    })
  })

  it('renders without crashing', async () => {
    render(
      <BrowserRouter>
        <OrderList />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/Order Management/i)).toBeInTheDocument()
    })
  })

  it('displays loading state initially', () => {
    render(
      <BrowserRouter>
        <OrderList />
      </BrowserRouter>
    )
    expect(screen.getByText(/Loading orders/i)).toBeInTheDocument()
  })

  it('fetches and displays orders', async () => {
    render(
      <BrowserRouter>
        <OrderList />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(orderService.getAllOrders).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      })
    })

    await waitFor(() => {
      expect(screen.getByText('TEST-001')).toBeInTheDocument()
      expect(screen.getByText('TEST-002')).toBeInTheDocument()
    })
  })

  it('displays error message when fetch fails', async () => {
    orderService.getAllOrders.mockRejectedValue({
      response: { data: { error: 'Failed to fetch' } },
    })

    render(
      <BrowserRouter>
        <OrderList />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument()
    })
  })

  it('displays empty table when orders array is empty', async () => {
    orderService.getAllOrders.mockResolvedValue({
      data: [],
      pagination: { ...mockPagination, total: 0 },
    })

    render(
      <BrowserRouter>
        <OrderList />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/0 total orders/i)).toBeInTheDocument()
    })
  })
})