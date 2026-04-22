import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import orderService from '../services/orderService';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderService.getOrderById(orderId);
      setOrder(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    try {
      await orderService.releaseOrder(orderId);
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to release order');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    
    try {
      await orderService.deleteOrder(orderId);
      navigate('/orders');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete order');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      CREATED: 'bg-gray-100 text-gray-800 border-gray-300',
      RELEASABLE: 'bg-blue-100 text-blue-800 border-blue-300',
      RELEASED: 'bg-green-100 text-green-800 border-green-300',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      COMPLETED: 'bg-purple-100 text-purple-800 border-purple-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status) => {
    return '';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="mt-4 text-white font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-fadeIn">
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
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="container mx-auto px-4 max-w-6xl animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 card-hover">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/orders/${orderId}/edit`)}
              className="btn-secondary flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </button>
            {order.status === 'RELEASABLE' && (
              <button onClick={handleRelease} className="btn-success flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Release</span>
              </button>
            )}
            <button onClick={handleDelete} className="btn-danger flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Order Header Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6 card-hover">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{order.orderId}</h1>
              <p className="text-blue-100 text-lg">{order.orderNumber}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)} {order.status}
            </span>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Material */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-l-4 border-blue-500">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-sm font-bold text-gray-600 uppercase">Material</h3>
              </div>
              <p className="text-xl font-bold text-gray-900">{order.material}</p>
            </div>

            {/* Plant */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-l-4 border-green-500">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-sm font-bold text-gray-600 uppercase">Plant</h3>
              </div>
              <p className="text-xl font-bold text-gray-900">{order.plant}</p>
            </div>

            {/* Quantity */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl border-l-4 border-indigo-500">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <h3 className="text-sm font-bold text-gray-600 uppercase">Quantity</h3>
              </div>
              <p className="text-xl font-bold text-gray-900">{order.quantity} units</p>
            </div>

            {/* Priority */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border-l-4 border-yellow-500">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-sm font-bold text-gray-600 uppercase">Priority</h3>
              </div>
              <p className="text-xl font-bold text-gray-900">{order.priority}</p>
            </div>

            {/* Scheduled Start */}
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-xl border-l-4 border-cyan-500">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-cyan-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-sm font-bold text-gray-600 uppercase">Start Date</h3>
              </div>
              <p className="text-sm font-bold text-gray-900">{formatDate(order.scheduledStartDate)}</p>
            </div>

            {/* Scheduled Completion */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl border-l-4 border-teal-500">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-teal-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h3 className="text-sm font-bold text-gray-600 uppercase">Completion Date</h3>
              </div>
              <p className="text-sm font-bold text-gray-900">{formatDate(order.scheduledCompletionDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 card-hover">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-6">
          Order Metadata
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="bg-blue-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Created Date</h3>
              <p className="text-lg font-bold text-gray-900">{formatDate(order.createdDate)}</p>
            </div>
          </div>

          <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Last Updated</h3>
              <p className="text-lg font-bold text-gray-900">{formatDate(order.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;