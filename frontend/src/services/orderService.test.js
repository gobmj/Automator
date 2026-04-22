import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Order Service', () => {
  let orderService
  let mockApi

  beforeEach(async () => {
    // Create mock API
    mockApi = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }

    // Mock axios module
    vi.doMock('axios', () => ({
      default: {
        create: vi.fn(() => mockApi),
      },
    }))

    // Import service after mocking
    const module = await import('./orderService.js')
    orderService = module.default
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('getAllOrders', () => {
    it('should fetch all orders with default params', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [],
          pagination: { page: 1, limit: 10, total: 0 },
        },
      }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await orderService.getAllOrders()

      expect(mockApi.get).toHaveBeenCalledWith('/orders', { params: {} })
      expect(result).toEqual(mockResponse.data)
    })

    it('should fetch orders with custom params', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [],
          pagination: { page: 2, limit: 20, total: 0 },
        },
      }
      mockApi.get.mockResolvedValue(mockResponse)

      const params = { page: 2, limit: 20, status: 'CREATED' }
      await orderService.getAllOrders(params)

      expect(mockApi.get).toHaveBeenCalledWith('/orders', { params })
    })
  })

  describe('getOrderById', () => {
    it('should fetch order by ID', async () => {
      const mockOrder = {
        orderId: 'ORD-2026-001',
        orderNumber: 'TEST-001',
        material: 'FORKLIFT-FRAME',
      }
      const mockResponse = {
        data: {
          success: true,
          data: mockOrder,
        },
      }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await orderService.getOrderById('ORD-2026-001')

      expect(mockApi.get).toHaveBeenCalledWith('/orders/ORD-2026-001')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('createOrder', () => {
    it('should create a new order', async () => {
      const orderData = {
        orderNumber: 'TEST-001',
        material: 'FORKLIFT-FRAME',
        quantity: 5,
      }
      const mockResponse = {
        data: {
          success: true,
          data: { orderId: 'ORD-2026-001', ...orderData },
        },
      }
      mockApi.post.mockResolvedValue(mockResponse)

      const result = await orderService.createOrder(orderData)

      expect(mockApi.post).toHaveBeenCalledWith('/orders', orderData)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('updateOrder', () => {
    it('should update an existing order', async () => {
      const orderId = 'ORD-2026-001'
      const updateData = { quantity: 10 }
      const mockResponse = {
        data: {
          success: true,
          data: { orderId, quantity: 10 },
        },
      }
      mockApi.put.mockResolvedValue(mockResponse)

      const result = await orderService.updateOrder(orderId, updateData)

      expect(mockApi.put).toHaveBeenCalledWith(`/orders/${orderId}`, updateData)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('deleteOrder', () => {
    it('should delete an order', async () => {
      const orderId = 'ORD-2026-001'
      const mockResponse = {
        data: {
          success: true,
          message: 'Order deleted successfully',
        },
      }
      mockApi.delete.mockResolvedValue(mockResponse)

      const result = await orderService.deleteOrder(orderId)

      expect(mockApi.delete).toHaveBeenCalledWith(`/orders/${orderId}`)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('releaseOrder', () => {
    it('should release an order', async () => {
      const orderId = 'ORD-2026-001'
      const mockResponse = {
        data: {
          success: true,
          data: { orderId, status: 'RELEASED' },
        },
      }
      mockApi.post.mockResolvedValue(mockResponse)

      const result = await orderService.releaseOrder(orderId)

      expect(mockApi.post).toHaveBeenCalledWith(`/orders/${orderId}/release`)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('searchOrders', () => {
    it('should search orders by term', async () => {
      const searchTerm = 'TEST'
      const mockResponse = {
        data: {
          success: true,
          data: [],
        },
      }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await orderService.searchOrders(searchTerm)

      expect(mockApi.get).toHaveBeenCalledWith('/orders/search', {
        params: { q: searchTerm },
      })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('getOrdersByStatus', () => {
    it('should fetch orders by status', async () => {
      const status = 'CREATED'
      const mockResponse = {
        data: {
          success: true,
          data: [],
        },
      }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await orderService.getOrdersByStatus(status)

      expect(mockApi.get).toHaveBeenCalledWith(`/orders/status/${status}`)
      expect(result).toEqual(mockResponse.data)
    })
  })
})