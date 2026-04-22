import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import orderService from '../services/orderService';

const OrderForm = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!orderId;

  const [formData, setFormData] = useState({
    orderNumber: '',
    material: '',
    quantity: '',
    priority: '500',
    status: 'CREATED',
    plant: '',
    scheduledStartDate: '',
    scheduledCompletionDate: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const statuses = ['CREATED', 'RELEASABLE', 'RELEASED', 'IN_PROGRESS', 'COMPLETED'];

  useEffect(() => {
    if (isEdit) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderService.getOrderById(orderId);
      const order = response.data;
      
      setFormData({
        orderNumber: order.orderNumber,
        material: order.material,
        quantity: order.quantity.toString(),
        priority: order.priority.toString(),
        status: order.status,
        plant: order.plant,
        scheduledStartDate: order.scheduledStartDate.split('T')[0],
        scheduledCompletionDate: order.scheduledCompletionDate.split('T')[0],
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      
      const orderData = {
        ...formData,
        quantity: parseInt(formData.quantity),
        priority: parseInt(formData.priority),
        scheduledStartDate: new Date(formData.scheduledStartDate).toISOString(),
        scheduledCompletionDate: new Date(formData.scheduledCompletionDate).toISOString(),
      };

      if (isEdit) {
        await orderService.updateOrder(orderId, orderData);
      } else {
        await orderService.createOrder(orderData);
      }

      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.message || 'Failed to save order');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="mt-4 text-white font-medium">Loading order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 max-w-4xl animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 card-hover">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-2">
              {isEdit ? 'Edit Order' : 'Create New Order'}
            </h1>
            <p className="text-gray-600">
              {isEdit ? 'Update order information' : 'Fill in the details to create a new order'}
            </p>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6 animate-fadeIn">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 card-hover">
        <div className="space-y-6">
          {/* Order Number */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Order Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="orderNumber"
              value={formData.orderNumber}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g., TEST-001"
            />
          </div>

          {/* Material */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Material <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="material"
              value={formData.material}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g., FORKLIFT-FRAME"
            />
          </div>

          {/* Quantity and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                required
                min="1"
                max="1000"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="1-1000"
              />
            </div>
          </div>

          {/* Status and Plant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Plant <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="plant"
                value={formData.plant}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="e.g., DT6364"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Scheduled Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="scheduledStartDate"
                value={formData.scheduledStartDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Scheduled Completion Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="scheduledCompletionDate"
                value={formData.scheduledCompletionDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEdit ? 'Update Order' : 'Create Order'}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;