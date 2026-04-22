import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import OrderList from './components/OrderList';
import OrderForm from './components/OrderForm';
import OrderDetails from './components/OrderDetails';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        {/* Modern Navbar with Gradient */}
        <nav className="bg-white shadow-lg sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to="/orders" className="flex items-center space-x-3 group">
                <div className="bg-gradient-to-r from-blue-700 to-blue-900 p-2 rounded-lg group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">
                    Order Manager
                  </h1>
                  <p className="text-xs text-gray-500 font-medium">Order Management Platform for Manufacturing</p>
                </div>
              </Link>
              
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">System Active</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content with Background */}
        <div className="min-h-[calc(100vh-80px)] py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<OrderList />} />
            <Route path="/orders/new" element={<OrderForm />} />
            <Route path="/orders/:orderId" element={<OrderDetails />} />
            <Route path="/orders/:orderId/edit" element={<OrderForm />} />
          </Routes>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
          <div className="container mx-auto px-6">
            <div className="flex flex-col items-center justify-center space-y-2">
              <p className="text-sm text-gray-600 text-center">
                © 2026 Order Management System - BITS Dissertation Project
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
